import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { db } from "./db";
import type { Minutes, PlayerCount } from "./rules";
import type {
  PlayerSummary,
  TournamentDetail,
  TournamentStatus,
  TournamentSummary,
} from "./types";

/** A lobby rule was broken (full, already started, ...). The message is safe to show. */
export class TournamentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TournamentError";
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "kc:no_user": "Please log in again.",
  "kc:already_active": "You're already in another tournament. Leave it (or finish it) first.",
  "kc:not_found": "That tournament doesn't exist.",
  "kc:not_open": "This tournament has already started or was cancelled.",
  "kc:full": "This tournament is full.",
  "kc:not_host": "Only the host can do that.",
  "kc:not_full": "Every spot must be filled before the tournament can start.",
  "kc:host_cannot_leave": "Hosts can't leave. Cancel the tournament instead.",
};

/** Turns a database error into a TournamentError when it is one of our rule codes. */
function toError(error: { message: string }): Error {
  const code = Object.keys(ERROR_MESSAGES).find((key) => error.message.includes(key));
  return code ? new TournamentError(code, ERROR_MESSAGES[code]) : new Error(error.message);
}

// ---------- reads ----------

type UserEmbed = { id: string; display_name: string; photo_url: string | null };

type SummaryRow = {
  id: string;
  name: string;
  size: number;
  minutes: number;
  status: TournamentStatus;
  created_at: string;
  host: UserEmbed;
  tournament_players: { count: number }[];
};

type DetailRow = Omit<SummaryRow, "tournament_players"> & {
  host_plays: boolean;
  current_round: number;
  started_at: string | null;
  tournament_players: {
    joined_at: string;
    user: UserEmbed & { is_test: boolean };
  }[];
};

const HOST = "host:users!host_id(id, display_name, photo_url)";

function toPlayer(user: UserEmbed): PlayerSummary {
  return { id: user.id, displayName: user.display_name, photoUrl: user.photo_url };
}

function toSummary(row: SummaryRow): TournamentSummary {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    minutes: row.minutes,
    status: row.status,
    host: toPlayer(row.host),
    playerCount: row.tournament_players[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

/** Tournaments people can still join, newest first. */
export async function listOpenTournaments(): Promise<TournamentSummary[]> {
  const { data, error } = await db()
    .from("tournaments")
    .select(`id, name, size, minutes, status, created_at, ${HOST}, tournament_players(count)`)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<SummaryRow[]>();
  if (error) throw toError(error);
  return data.map(toSummary);
}

/** Cached per request, so the page and its metadata share one query. */
export const getTournament = cache(async (id: string): Promise<TournamentDetail | null> => {
  const { data, error } = await db()
    .from("tournaments")
    .select(
      `id, name, size, minutes, status, created_at, host_plays, current_round, started_at, ${HOST},
       tournament_players(joined_at, user:users(id, display_name, photo_url, is_test))`,
    )
    .eq("id", id)
    .maybeSingle<DetailRow>();
  if (error) throw toError(error);
  if (!data) return null;

  const players = data.tournament_players
    .map((p) => ({ ...toPlayer(p.user), joinedAt: p.joined_at, isTest: p.user.is_test }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  return {
    ...toSummary({ ...data, tournament_players: [{ count: players.length }] }),
    hostPlays: data.host_plays,
    currentRound: data.current_round,
    startedAt: data.started_at,
    players,
  };
});

/** The open or running tournament this user hosts or plays in, if any. */
export async function getActiveTournamentId(userId: string): Promise<string | null> {
  const { data, error } = await db().rpc("kc_active_tournament", { p_user: userId });
  if (error) throw toError(error);
  return (data as string | null) ?? null;
}

// ---------- lobby changes (each is one locked transaction in the database) ----------

export async function createTournament(input: {
  hostId: string;
  name: string;
  size: PlayerCount;
  minutes: Minutes;
  hostPlays: boolean;
}): Promise<string> {
  const { data, error } = await db().rpc("kc_create_tournament", {
    p_host: input.hostId,
    p_name: input.name,
    p_size: input.size,
    p_minutes: input.minutes,
    p_host_plays: input.hostPlays,
  });
  if (error) throw toError(error);
  return data as string;
}

async function call(fn: string, tournamentId: string, userId: string): Promise<void> {
  const { error } = await db().rpc(fn, { p_tournament: tournamentId, p_user: userId });
  if (error) throw toError(error);
}

export const joinTournament = (tournamentId: string, userId: string) =>
  call("kc_join_tournament", tournamentId, userId);

export const leaveTournament = (tournamentId: string, userId: string) =>
  call("kc_leave_tournament", tournamentId, userId);

export const cancelTournament = (tournamentId: string, userId: string) =>
  call("kc_cancel_tournament", tournamentId, userId);

export const startTournament = (tournamentId: string, userId: string) =>
  call("kc_start_tournament", tournamentId, userId);

// ---------- dev only ----------

/**
 * Creates fake players and joins them, so one person can fill a bracket while
 * testing. Ids contain "~", which real Lichess ids never do. Returns how many joined.
 */
export async function addTestPlayers(tournamentId: string, count: number): Promise<number> {
  let added = 0;
  for (let i = 0; i < count; i++) {
    const suffix = randomBytes(3).toString("hex");
    const id = `test~${suffix}`;
    const { error: userError } = await db().from("users").insert({
      id,
      lichess_username: id,
      display_name: `Test ${suffix.slice(0, 4).toUpperCase()}`,
      is_test: true,
    });
    if (userError) throw toError(userError);

    try {
      await joinTournament(tournamentId, id);
      added++;
    } catch (error) {
      // Clean up the unused fake user, then stop (usually: the tournament is full).
      await db().from("users").delete().eq("id", id);
      if (error instanceof TournamentError && error.code === "kc:full") break;
      throw error;
    }
  }
  return added;
}
