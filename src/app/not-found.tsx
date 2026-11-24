import Link from "next/link";
import { buttonSecondary, card, muted } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <div className={`${card} flex flex-col items-start gap-3`}>
        <h1 className="text-lg font-semibold">Not found</h1>
        <p className={muted}>That page or tournament doesn&apos;t exist.</p>
        <Link href="/tournaments" className={buttonSecondary}>
          Back to tournaments
        </Link>
      </div>
    </main>
  );
}
