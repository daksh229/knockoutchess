/** "5 / 8 players" with a thin progress bar. */
export function SpotsBar({ filled, size }: { filled: number; size: number }) {
  const percent = Math.round((filled / size) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <span className="font-medium tabular-nums">{filled}</span>
          <span className="text-zinc-500 tabular-nums"> / {size} players</span>
        </span>
        {filled < size ? (
          <span className="text-xs text-zinc-500">
            {size - filled} {size - filled === 1 ? "spot" : "spots"} left
          </span>
        ) : (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Full</span>
        )}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={size}
        aria-label="Players joined"
      >
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
