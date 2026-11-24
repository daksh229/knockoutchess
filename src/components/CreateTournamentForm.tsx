"use client";

import { useActionState } from "react";
import { createTournamentAction } from "@/app/tournaments/actions";
import {
  PLAYER_COUNTS,
  TIME_CONTROLS,
  TOURNAMENT_NAME_MAX,
  TOURNAMENT_NAME_MIN,
} from "@/lib/rules";
import { buttonPrimary, card, input, muted } from "./ui";

const pill =
  "cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium tabular-nums transition-colors hover:bg-zinc-50 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-600 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function CreateTournamentForm() {
  const [state, formAction, pending] = useActionState(createTournamentAction, {});

  return (
    <form action={formAction} className={`${card} flex flex-col gap-6`}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Tournament name
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={TOURNAMENT_NAME_MIN}
          maxLength={TOURNAMENT_NAME_MAX}
          placeholder="Friday Night Blitz"
          autoComplete="off"
          className={input}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Players</legend>
        <div className="flex flex-wrap gap-2">
          {PLAYER_COUNTS.map((count) => (
            <label key={count} className={pill}>
              <input
                type="radio"
                name="size"
                value={count}
                defaultChecked={count === 8}
                className="sr-only"
              />
              {count}
            </label>
          ))}
        </div>
        <p className={muted}>The tournament starts once every spot is filled.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Time per player</legend>
        <div className="flex flex-wrap gap-2">
          {TIME_CONTROLS.map((minutes) => (
            <label key={minutes} className={pill}>
              <input
                type="radio"
                name="minutes"
                value={minutes}
                defaultChecked={minutes === 5}
                className="sr-only"
              />
              {minutes} min
            </label>
          ))}
        </div>
        <p className={muted}>No extra time per move.</p>
      </fieldset>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="hostPlays"
          defaultChecked
          className="mt-0.5 size-4 accent-emerald-600"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">I&apos;m playing too</span>
          <span className={muted}>Untick to only organise. You still take one spot if ticked.</span>
        </span>
      </label>

      <div className="flex flex-col items-start gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Creating…" : "Create tournament"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
