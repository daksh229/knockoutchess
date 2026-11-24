import { NextResponse, type NextRequest } from "next/server";
import { env, isDbConfigured } from "@/lib/env";
import { exchangeCodeForToken, fetchAccount, revokeToken, type LichessAccount } from "@/lib/lichess";
import { OAUTH_COOKIE, callbackUrl, oauthCookieOptions, parsePending } from "@/lib/oauth";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { ensureUser } from "@/lib/users";

type LoginError = "denied" | "expired" | "failed" | "db";

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));
  // The PKCE cookie is single-use either way.
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });
  return response;
}

function fail(request: NextRequest, reason: LoginError) {
  return redirectTo(request, `/?login=${reason}`);
}

/** Lichess sends the user back here after they approve (or cancel) the login. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("error")) return fail(request, "denied");

  const code = params.get("code");
  const state = params.get("state");
  const pending = parsePending(request.cookies.get(OAUTH_COOKIE)?.value);
  if (!code || !state || !pending || pending.state !== state) {
    return fail(request, "expired");
  }

  let account: LichessAccount;
  try {
    const token = await exchangeCodeForToken({
      code,
      codeVerifier: pending.verifier,
      redirectUri: callbackUrl(request),
      clientId: env.lichessClientId(),
    });
    account = await fetchAccount(token);
    await revokeToken(token);
  } catch (error) {
    console.error("Lichess login failed", error);
    return fail(request, "failed");
  }

  if (isDbConfigured()) {
    try {
      await ensureUser(account);
    } catch (error) {
      console.error("Saving user failed", error);
      return fail(request, "db");
    }
  }

  const response = redirectTo(request, "/tournaments");
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionToken({ userId: account.id, username: account.username }),
    sessionCookieOptions,
  );
  return response;
}
