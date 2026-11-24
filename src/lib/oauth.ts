import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "./env";
import { LICHESS_URL } from "./lichess";

/** Short-lived cookie that carries the PKCE verifier and state between login and callback. */
export const OAUTH_COOKIE = "kc_oauth";

export const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 10 * 60, // 10 minutes to finish logging in
};

export type OAuthPending = { verifier: string; state: string };

export function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export function codeChallengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function callbackUrl(request: NextRequest): string {
  const base = env.appUrl() ?? request.nextUrl.origin;
  return `${base}/api/auth/callback`;
}

export function lichessAuthorizeUrl(params: {
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): URL {
  const url = new URL("/oauth", LICHESS_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.lichessClientId(),
    redirect_uri: params.redirectUri,
    code_challenge_method: "S256",
    code_challenge: params.codeChallenge,
    state: params.state,
  }).toString();
  return url;
}

export function parsePending(raw: string | undefined): OAuthPending | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<OAuthPending>;
    if (typeof value.verifier === "string" && typeof value.state === "string") {
      return { verifier: value.verifier, state: value.state };
    }
  } catch {
    // fall through
  }
  return null;
}
