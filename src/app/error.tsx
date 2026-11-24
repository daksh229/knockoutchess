"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { buttonPrimary, card, muted } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <div className={`${card} flex flex-col items-start gap-3`}>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className={muted}>
          This is usually temporary. Try again, and if it keeps happening, check the server log.
          {digest && (
            <>
              {" "}
              Reference: <code className="font-mono">{digest}</code>
            </>
          )}
        </p>
        <button type="button" onClick={() => retry()} className={buttonPrimary}>
          Try again
        </button>
      </div>
    </main>
  );
}
