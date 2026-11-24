import { redirect } from "next/navigation";
import { buttonPrimary, card, link, muted } from "@/components/ui";
import { APP_NAME } from "@/lib/app";
import { getSession } from "@/lib/session";

const LOGIN_ERRORS: Record<string, string> = {
  denied: "Login was cancelled on Lichess.",
  expired: "That login link expired. Please try again.",
  failed: "Couldn't reach Lichess to log you in. Please try again.",
  db: "You logged in to Lichess, but saving your profile failed. Please try again.",
};

const STEPS = [
  { title: "Log in with Lichess", body: "One login. You stay logged in on Lichess to play." },
  { title: "Host or join", body: "Create a tournament for 2–32 players, or join an open one." },
  { title: "Play your match", body: "Each game opens on Lichess. Winners move on until one is left." },
];

export default async function Home(props: PageProps<"/">) {
  if (await getSession()) redirect("/tournaments");

  const { login } = await props.searchParams;
  const error = typeof login === "string" ? LOGIN_ERRORS[login] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Knockout chess tournaments with your friends
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 text-pretty dark:text-zinc-400">
          {APP_NAME} pairs everyone at random, runs every round on Lichess and keeps the bracket
          up to date until one champion is left.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-3">
        {/* A plain link: login is a full-page redirect to Lichess, never prefetched. */}
        <a href="/api/auth/login" className={`${buttonPrimary} px-6 py-3 text-base`}>
          Log in with Lichess
        </a>
        <p className={muted}>
          No Lichess account?{" "}
          <a href="https://lichess.org/signup" target="_blank" rel="noreferrer" className={link}>
            Create one free
          </a>
          , then come back.
        </p>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className={`${card} flex flex-col gap-2 p-5`}>
            <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
              {index + 1}
            </span>
            <span className="font-medium">{step.title}</span>
            <span className={muted}>{step.body}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
