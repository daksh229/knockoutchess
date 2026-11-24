import { card, muted } from "./ui";

/** Shown in place of database-backed screens until Supabase is connected. */
export function DbNotice({ what }: { what: string }) {
  return (
    <div className={card}>
      <p className="font-medium">{what} need the database.</p>
      <p className={`${muted} mt-1`}>
        Fill in <code className="font-mono">SUPABASE_URL</code> and{" "}
        <code className="font-mono">SUPABASE_SECRET_KEY</code> in{" "}
        <code className="font-mono">.env.local</code>, run the SQL files in{" "}
        <code className="font-mono">supabase/migrations/</code> (see the README), then restart the
        app.
      </p>
    </div>
  );
}
