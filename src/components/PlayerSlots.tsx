import type { TournamentDetail } from "@/lib/types";
import { Avatar } from "./Avatar";

/** Grid with one tile per spot: joined players first, then empty spots. */
export function PlayerSlots({
  tournament,
  viewerId,
}: {
  tournament: TournamentDetail;
  viewerId: string;
}) {
  const empty = Math.max(0, tournament.size - tournament.players.length);

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {tournament.players.map((player) => {
        const tags = [
          player.id === tournament.host.id && "Host",
          player.id === viewerId && "You",
          player.isTest && "Test",
        ].filter(Boolean);

        return (
          <li
            key={player.id}
            className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 ${
              player.id === viewerId
                ? "border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <Avatar name={player.displayName} photoUrl={player.photoUrl} size={28} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{player.displayName}</span>
              {tags.length > 0 && (
                <span className="truncate text-xs text-zinc-500">{tags.join(" · ")}</span>
              )}
            </div>
          </li>
        );
      })}

      {Array.from({ length: empty }, (_, i) => (
        <li
          key={`empty-${i}`}
          className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700"
        >
          <span
            aria-hidden
            className="inline-block size-7 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700"
          />
          Open spot
        </li>
      ))}
    </ul>
  );
}
