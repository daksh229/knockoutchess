import type { TournamentStatus } from "@/lib/types";

const STYLES: Record<TournamentStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300",
  },
  running: {
    label: "In progress",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300",
  },
  finished: {
    label: "Finished",
    className: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300",
  },
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
