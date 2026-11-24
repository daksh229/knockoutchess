import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";
import { ensureUser } from "./users";

/**
 * For Server Actions: the logged-in session, or a redirect to the home page.
 * Call it outside try/catch, because redirect() works by throwing.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

/** Users who logged in before the database was connected have no row yet. */
export function ensureUserRow(session: Session): Promise<void> {
  return ensureUser({ id: session.userId, username: session.username });
}
