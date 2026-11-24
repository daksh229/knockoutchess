import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DbNotice } from "@/components/DbNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { TournamentCard } from "@/components/TournamentCard";
import { buttonPrimary, buttonSecondary, card, muted } from "@/components/ui";
import { isDbConfigured } from "@/lib/env";
import { getActiveTournamentId, getTournament, listOpenTournaments } from "@/lib/tournaments";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = { title: "Tournaments" };

export default async function TournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  if (!isDbConfigured()) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Tournaments</h1>
        <DbNotice what="Tournaments" />
      </main>
    );
  }

  const [openTournaments, activeId] = await Promise.all([
    listOpenTournaments(),
    getActiveTournamentId(user.id),
  ]);
  const active = activeId ? await getTournament(activeId) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <AutoRefresh seconds={5} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tournaments</h1>
          <p className={`${muted} mt-1`}>Open tournaments you can join. This list updates by itself.</p>
        </div>
        {!active && (
          <Link href="/tournaments/new" className={buttonPrimary}>
            Host a tournament
          </Link>
        )}
      </div>

      {active && (
        <section
          aria-label="Your tournament"
          className={`${card} flex flex-wrap items-center justify-between gap-4 border-emerald-600/40`}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {active.host.id === user.id ? "You're hosting" : "You're playing in"}
              </span>
              <StatusBadge status={active.status} />
            </div>
            <span className="truncate text-lg font-semibold">{active.name}</span>
            <span className={muted}>
              {active.players.length} / {active.size} players · {active.minutes} min games
            </span>
          </div>
          <Link href={`/tournaments/${active.id}`} className={buttonSecondary}>
            Open
          </Link>
        </section>
      )}

      <section aria-labelledby="open-heading" className="flex flex-col gap-4">
        <h2 id="open-heading" className="text-sm font-medium text-zinc-500">
          Open tournaments
        </h2>
        {openTournaments.length === 0 ? (
          <div className={`${card} flex flex-col items-start gap-2`}>
            <p className="font-medium">No open tournaments right now.</p>
            <p className={muted}>
              {active
                ? "New ones will show up here."
                : "Host one and share the site with your friends. It'll show up here for everyone."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} canJoin={!active} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
