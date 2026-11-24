-- Step 2: tournaments, players, and the lobby rules.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run (after 001).
--
-- Every lobby change (create / join / leave / cancel / start) goes through one
-- of the kc_* functions below. Each runs as a single transaction and locks the
-- rows it checks, so two people grabbing the last spot at the same moment
-- can't overfill a tournament. Errors are raised as 'kc:<code>' and turned
-- into friendly messages by the app.

-- Test players (dev mode only) are marked so they're easy to spot and delete.
alter table public.users add column if not exists is_test boolean not null default false;

create table if not exists public.tournaments (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 3 and 40),
  host_id       text not null references public.users(id),
  size          int  not null check (size in (2, 4, 8, 16, 32)),
  minutes       int  not null check (minutes in (5, 10)),
  host_plays    boolean not null,
  status        text not null default 'open'
                check (status in ('open', 'running', 'finished', 'cancelled')),
  current_round int  not null default 0,
  champion_id   text references public.users(id),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
create index if not exists tournaments_status_created_idx
  on public.tournaments (status, created_at desc);
create index if not exists tournaments_host_idx on public.tournaments (host_id);

create table if not exists public.tournament_players (
  tournament_id    uuid not null references public.tournaments(id) on delete cascade,
  user_id          text not null references public.users(id),
  joined_at        timestamptz not null default now(),
  eliminated_round int,  -- null while still in the tournament
  primary key (tournament_id, user_id)
);
create index if not exists tournament_players_user_idx on public.tournament_players (user_id);

-- Only our server (secret key) touches these tables.
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
grant select, insert, update, delete on public.tournaments, public.tournament_players to service_role;

-- The open or running tournament a user hosts or plays in (null if none).
-- Rule: a user can be in only one active tournament at a time.
create or replace function public.kc_active_tournament(p_user text)
returns uuid
language sql stable
set search_path = ''
as $$
  select t.id
  from public.tournaments t
  where t.status in ('open', 'running')
    and (
      t.host_id = p_user
      or exists (
        select 1 from public.tournament_players p
        where p.tournament_id = t.id and p.user_id = p_user
      )
    )
  order by t.created_at desc
  limit 1
$$;

create or replace function public.kc_create_tournament(
  p_host text, p_name text, p_size int, p_minutes int, p_host_plays boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- Lock the user so two quick clicks can't create two tournaments.
  perform 1 from public.users where id = p_host for update;
  if not found then raise exception 'kc:no_user'; end if;

  if public.kc_active_tournament(p_host) is not null then
    raise exception 'kc:already_active';
  end if;

  insert into public.tournaments (name, host_id, size, minutes, host_plays)
  values (p_name, p_host, p_size, p_minutes, p_host_plays)
  returning id into v_id;

  if p_host_plays then
    insert into public.tournament_players (tournament_id, user_id) values (v_id, p_host);
  end if;

  return v_id;
end
$$;

create or replace function public.kc_join_tournament(p_tournament uuid, p_user text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_t public.tournaments;
  v_active uuid;
  v_count int;
begin
  -- Lock order everywhere: user row first, then tournament row.
  perform 1 from public.users where id = p_user for update;
  if not found then raise exception 'kc:no_user'; end if;

  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'kc:not_found'; end if;

  if exists (
    select 1 from public.tournament_players
    where tournament_id = p_tournament and user_id = p_user
  ) then
    return; -- already in: joining twice is a no-op
  end if;

  if v_t.status <> 'open' then raise exception 'kc:not_open'; end if;

  v_active := public.kc_active_tournament(p_user);
  if v_active is not null and v_active <> p_tournament then
    raise exception 'kc:already_active';
  end if;

  select count(*) into v_count from public.tournament_players where tournament_id = p_tournament;
  if v_count >= v_t.size then raise exception 'kc:full'; end if;

  insert into public.tournament_players (tournament_id, user_id) values (p_tournament, p_user);
end
$$;

create or replace function public.kc_leave_tournament(p_tournament uuid, p_user text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_t public.tournaments;
begin
  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'kc:not_found'; end if;
  if v_t.status <> 'open' then raise exception 'kc:not_open'; end if;
  if v_t.host_id = p_user then raise exception 'kc:host_cannot_leave'; end if;

  delete from public.tournament_players
  where tournament_id = p_tournament and user_id = p_user;
end
$$;

create or replace function public.kc_cancel_tournament(p_tournament uuid, p_user text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_t public.tournaments;
begin
  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'kc:not_found'; end if;
  if v_t.host_id <> p_user then raise exception 'kc:not_host'; end if;
  if v_t.status <> 'open' then raise exception 'kc:not_open'; end if;

  update public.tournaments
  set status = 'cancelled', finished_at = now()
  where id = p_tournament;
end
$$;

-- Step 2 only marks the tournament as running. Step 3 extends this to draw
-- round 1 in the same transaction.
create or replace function public.kc_start_tournament(p_tournament uuid, p_user text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_t public.tournaments;
  v_count int;
begin
  select * into v_t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'kc:not_found'; end if;
  if v_t.host_id <> p_user then raise exception 'kc:not_host'; end if;
  if v_t.status <> 'open' then raise exception 'kc:not_open'; end if;

  select count(*) into v_count from public.tournament_players where tournament_id = p_tournament;
  if v_count <> v_t.size then raise exception 'kc:not_full'; end if;

  update public.tournaments
  set status = 'running', started_at = now()
  where id = p_tournament;
end
$$;

-- Only our server may call these functions.
revoke execute on function public.kc_active_tournament(text) from public, anon, authenticated;
revoke execute on function public.kc_create_tournament(text, text, int, int, boolean) from public, anon, authenticated;
revoke execute on function public.kc_join_tournament(uuid, text) from public, anon, authenticated;
revoke execute on function public.kc_leave_tournament(uuid, text) from public, anon, authenticated;
revoke execute on function public.kc_cancel_tournament(uuid, text) from public, anon, authenticated;
revoke execute on function public.kc_start_tournament(uuid, text) from public, anon, authenticated;

grant execute on function public.kc_active_tournament(text) to service_role;
grant execute on function public.kc_create_tournament(text, text, int, int, boolean) to service_role;
grant execute on function public.kc_join_tournament(uuid, text) to service_role;
grant execute on function public.kc_leave_tournament(uuid, text) to service_role;
grant execute on function public.kc_cancel_tournament(uuid, text) to service_role;
grant execute on function public.kc_start_tournament(uuid, text) to service_role;
