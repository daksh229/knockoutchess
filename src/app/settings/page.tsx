import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { SettingsForm } from "@/components/SettingsForm";
import { link, muted } from "@/components/ui";
import { isDbConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/users";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className={`${muted} mt-1`}>
          Lichess account:{" "}
          <a
            href={`https://lichess.org/@/${user.lichessUsername}`}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            {user.lichessUsername}
          </a>
        </p>
      </div>

      {isDbConfigured() ? <SettingsForm user={user} /> : <DbNotice what="Profile settings" />}
    </main>
  );
}
