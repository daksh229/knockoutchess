import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  /** Public base URL, without trailing slash. Undefined means "use the request's origin". */
  appUrl(): string | undefined {
    return process.env.APP_URL?.replace(/\/+$/, "") || undefined;
  },
  lichessClientId(): string {
    return process.env.LICHESS_CLIENT_ID || "knockout-chess";
  },
  sessionSecret(): string {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters long.");
    }
    return secret;
  },
  supabaseUrl(): string {
    return required("SUPABASE_URL");
  },
  supabaseSecretKey(): string {
    return required("SUPABASE_SECRET_KEY");
  },
};

/** True once the Supabase keys are filled in. Login works without them; profiles don't. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
