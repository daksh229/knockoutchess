import Link from "next/link";
import { joinTournamentAction } from "@/app/tournaments/actions";
import type { TournamentSummary } from "@/lib/types";
import { ActionButton } from "./ActionButton";
import { Avatar } from "./Avatar";
import { SpotsBar } from "./SpotsBar";
import { buttonPrimary, buttonSecondary, card } from "./ui";

/** One open tournament in the lobby list. */
export function TournamentCard({
  tournament,
  canJoin,
}: {
  tournament: TournamentSummary;
  /** False when the viewer is already in a tournament: show "View" instead of "Join". */
  canJoin: boolean;
}) {
  const full = tournament.playerCount >= tournament.size;

  return (
    <li className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex flex-col gap-1">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="truncate text-base font-semibold hover:underline"
        >
          {tournament.name}
        </Link>
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Avatar name={tournament.host.displayName} photoUrl={tournament.host.photoUrl} size={20} />
          <span className="truncate">{tournament.host.displayName}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{tournament.minutes} min games</span>
        </div>
      </div>

      <SpotsBar filled={tournament.playerCount} size={tournament.size} />

      <div className="flex items-center gap-2">
        {canJoin && !full ? (
          <ActionButton
            action={joinTournamentAction.bind(null, tournament.id)}
            label="Join"
            pendingLabel="Joining…"
            className={buttonPrimary}
          />
        ) : (
          <Link href={`/tournaments/${tournament.id}`} className={buttonSecondary}>
            View
          </Link>
        )}
      </div>
    </li>
  );
}
