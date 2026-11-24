import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/** What we keep in the login cookie: only the Lichess identity. */
export type Session = {
  /** Lichess user id (lowercase username). */
  userId: string;
  /** Lichess username with its original capitalisation. */
  username: string;
};

export const SESSION_COOKIE = "kc_session";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

function signingKey() {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(signingKey());
}

/** Reads and verifies the login cookie. Returns null when logged out or invalid. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") {
      return null;
    }
    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
});

/** Only callable from Server Actions and Route Handlers. */
export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
