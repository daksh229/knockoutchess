import "server-only";

/**
 * Lichess API client. Lichess asks for one request at a time and a
 * User-Agent naming the app on every request.
 */
export const LICHESS_URL = "https://lichess.org";
const USER_AGENT = "knockout-chess (web app)";

export class LichessError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LichessError";
  }
}

async function lichessFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", USER_AGENT);
  return fetch(`${LICHESS_URL}${path}`, { ...init, headers, cache: "no-store" });
}

/** Swaps the one-time login code for an access token (OAuth2 PKCE). */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<string> {
  const res = await lichessFetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
    }),
  });
  if (!res.ok) {
    throw new LichessError(`Token exchange failed (${res.status})`, res.status);
  }
  const data: unknown = await res.json();
  const token = (data as { access_token?: unknown }).access_token;
  if (typeof token !== "string" || !token) {
    throw new LichessError("Token response had no access_token");
  }
  return token;
}

export type LichessAccount = { id: string; username: string };

/** Reads the logged-in user's id and username. */
export async function fetchAccount(token: string): Promise<LichessAccount> {
  const res = await lichessFetch("/api/account", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new LichessError(`Account lookup failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as { id?: unknown; username?: unknown };
  if (typeof data.id !== "string" || typeof data.username !== "string") {
    throw new LichessError("Account response had no id/username");
  }
  return { id: data.id, username: data.username };
}

/**
 * We only need the username, so we give the token back right away.
 * Best effort: a failure here must not block login.
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    await lichessFetch("/api/token", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}
