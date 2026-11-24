import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Avatar } from "@/components/Avatar";
import { DbNotice } from "@/components/DbNotice";
import { PlayerSlots } from "@/components/PlayerSlots";
import { SpotsBar } from "@/components/SpotsBar";
import { StatusBadge } from "@/components/StatusBadge";
import { buttonGhost, buttonPrimary, buttonSecondary, card, muted } from "@/components/ui";
import { isDbConfigured } from "@/lib/env";
import { DEV_TOOLS_ENABLED, isUuid } from "@/lib/rules";
import { getActiveTournamentId, getTournament } from "@/lib/tournaments";
import type { TournamentDetail } from "@/lib/types";
import { getCurrentUser } from "@/lib/users";
import {
  addTestPlayersAction,
  cancelTournamentAction,
  joinTournamentAction,
  leaveTournamentAction,
  startTournamentAction,
} from "../actions";

export async function generateMetadata(props: PageProps<"/tournaments/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!isDbConfigured() || !isUuid(id)) return { title: "Tournament" };
  const tournament = await getTournament(id).catch(() => null);
  return { title: tournament?.name ?? "Tournament" };
}

function statusMessage(t: TournamentDetail, isHost: boolean): string {
  const missing = t.size - t.players.length;
  switch (t.status) {
    case "open":
      if (missing > 0) {
        return isHost
          ? `Waiting for ${missing} more ${missing === 1 ? "player" : "players"}. Your tournament is listed in the lobby, and you can start once every spot is filled.`
          : `Waiting for ${missing} more ${missing === 1 ? "player" : "players"}. The host starts the tournament once it's full.`;
      }
      return isHost
        ? "Everyone's here. Start when you're ready."
        : "It's full. Waiting for the host to start.";
    case "running":
      return "The tournament has started. Pairings and the bracket arrive in the next build step.";
    case "finished":
      return "This tournament is over.";
    case "cancelled":
      return "The host cancelled this tournament.";
  }
}

export default async function TournamentPage(props: PageProps<"/tournaments/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  if (!isDbConfigured()) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <DbNotice what="Tournaments" />
      </main>
    );
  }

  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const t = await getTournament(id);
  if (!t) notFound();

  const isHost = t.host.id === user.id;
  const isPlayer = t.players.some((p) => p.id === user.id);
  const isOpen = t.status === "open";
  const full = t.players.length >= t.size;

  // Only needed to explain why a visitor can't join.
  const activeElsewhere =
    isOpen && !isPlayer
      ? await getActiveTournamentId(user.id).then((activeId) => (activeId && activeId !== t.id ? activeId : null))
      : null;
  const canJoin = isOpen && !isPlayer && !full && !activeElsewhere;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      {(t.status === "open" || t.status === "running") && <AutoRefresh seconds={4} />}

      <Link href="/tournaments" className={`${buttonGhost} -ml-3 self-start`}>
        ← Tournaments
      </Link>

      <div className="flex flex-col gap-2">
        <StatusBadge status={t.status} />
        <h1 className="text-3xl font-semibold tracking-tight break-words">{t.name}</h1>
        <div className={`${muted} flex flex-wrap items-center gap-x-2 gap-y-1`}>
          <span className="flex items-center gap-1.5">
            Hosted by
            <Avatar name={t.host.displayName} photoUrl={t.host.photoUrl} size={20} />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{t.host.displayName}</span>
            {!t.hostPlays && !t.players.some((p) => p.id === t.host.id) && "(not playing)"}
          </span>
          <span aria-hidden>·</span>
          <span>{t.size} players</span>
          <span aria-hidden>·</span>
          <span>{t.minutes} min games</span>
        </div>
      </div>

      <p
        role="status"
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {statusMessage(t, isHost)}
      </p>

      {isOpen && (
        <div className="flex flex-wrap items-start gap-3">
          {canJoin && (
            <ActionButton
              action={joinTournamentAction.bind(null, t.id)}
              label="Join tournament"
              pendingLabel="Joining…"
              className={buttonPrimary}
            />
          )}
          {isPlayer && !isHost && (
            <ActionButton
              action={leaveTournamentAction.bind(null, t.id)}
              label="Leave"
              pendingLabel="Leaving…"
              className={buttonSecondary}
            />
          )}
          {isHost && (
            <>
              <ActionButton
                action={startTournamentAction.bind(null, t.id)}
                label="Start tournament"
                pendingLabel="Starting…"
                className={buttonPrimary}
                disabled={!full}
              />
              <ActionButton
                action={cancelTournamentAction.bind(null, t.id)}
                label="Cancel tournament"
                pendingLabel="Cancelling…"
                className={buttonSecondary}
                confirmText="Cancel this tournament for everyone?"
              />
            </>
          )}
          {activeElsewhere && (
            <p className={muted}>
              You&apos;re in{" "}
              <Link href={`/tournaments/${activeElsewhere}`} className="underline">
                another tournament
              </Link>
              . Leave it to join this one.
            </p>
          )}
        </div>
      )}

      <section aria-labelledby="players-heading" className={`${card} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="players-heading" className="text-base font-semibold">
            Players
          </h2>
          <div className="w-full sm:w-64">
            <SpotsBar filled={t.players.length} size={t.size} />
          </div>
        </div>
        <PlayerSlots tournament={t} viewerId={user.id} />
      </section>

      {DEV_TOOLS_ENABLED && isHost && isOpen && !full && (
        <section
          aria-label="Developer tools"
          className="flex flex-col gap-3 rounded-2xl border border-dashed border-amber-500/60 p-5"
        >
          <div>
            <p className="text-sm font-medium">Dev only: test players</p>
            <p className={muted}>Fake players to fill the bracket while testing. Hidden in production.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              action={addTestPlayersAction.bind(null, t.id, 1)}
              label="Add 1 test player"
              pendingLabel="Adding…"
              className={buttonSecondary}
            />
            <ActionButton
              action={addTestPlayersAction.bind(null, t.id, 0)}
              label="Fill remaining spots"
              pendingLabel="Filling…"
              className={buttonSecondary}
            />
          </div>
        </section>
      )}
    </main>
  );
}
