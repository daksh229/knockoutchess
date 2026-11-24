import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateTournamentForm } from "@/components/CreateTournamentForm";
import { DbNotice } from "@/components/DbNotice";
import { buttonSecondary, card, muted } from "@/components/ui";
import { isDbConfigured } from "@/lib/env";
import { getActiveTournamentId } from "@/lib/tournaments";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = { title: "Host a tournament" };

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const activeId = isDbConfigured() ? await getActiveTournamentId(user.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Host a tournament</h1>
        <p className={`${muted} mt-1`}>
          Knockout format: players are shuffled each round, winners move on, until one champion
          is left.
        </p>
      </div>

      {!isDbConfigured() ? (
        <DbNotice what="Tournaments" />
      ) : activeId ? (
        <div className={`${card} flex flex-col items-start gap-3`}>
          <p className="font-medium">You&apos;re already in a tournament.</p>
          <p className={muted}>You can be in one tournament at a time. Leave or finish it first.</p>
          <Link href={`/tournaments/${activeId}`} className={buttonSecondary}>
            Go to your tournament
          </Link>
        </div>
      ) : (
        <CreateTournamentForm />
      )}
    </main>
  );
}
