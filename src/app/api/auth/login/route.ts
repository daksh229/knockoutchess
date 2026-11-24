import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  callbackUrl,
  codeChallengeFor,
  lichessAuthorizeUrl,
  oauthCookieOptions,
  randomToken,
  type OAuthPending,
} from "@/lib/oauth";

/** Starts "Login with Lichess": remembers a PKCE verifier, then sends the user to Lichess. */
export async function GET(request: NextRequest) {
  const pending: OAuthPending = {
    verifier: randomToken(48), // 64 characters, within PKCE's 43–128
    state: randomToken(16),
  };

  const authorizeUrl = lichessAuthorizeUrl({
    redirectUri: callbackUrl(request),
    codeChallenge: codeChallengeFor(pending.verifier),
    state: pending.state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify(pending), oauthCookieOptions);
  return response;
}
