import "server-only";
import { cache } from "react";
import { db } from "./db";
import { isDbConfigured } from "./env";
import type { LichessAccount } from "./lichess";
import { getSession } from "./session";
import type { AppUser } from "./types";

const AVATAR_BUCKET = "avatars";

type UserRow = {
  id: string;
  lichess_username: string;
  display_name: string;
  photo_url: string | null;
};

function toUser(row: UserRow): AppUser {
  return {
    id: row.id,
    lichessUsername: row.lichess_username,
    displayName: row.display_name,
    photoUrl: row.photo_url,
  };
}

/**
 * Creates the user row on first login (display name = Lichess username).
 * On later logins only the Lichess username is refreshed; a custom display
 * name is kept.
 */
export async function ensureUser(account: LichessAccount): Promise<void> {
  const { error: insertError } = await db()
    .from("users")
    .upsert(
      { id: account.id, lichess_username: account.username, display_name: account.username },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (insertError) throw insertError;

  const { error: updateError } = await db()
    .from("users")
    .update({ lichess_username: account.username })
    .eq("id", account.id);
  if (updateError) throw updateError;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const { data, error } = await db()
    .from("users")
    .select("id, lichess_username, display_name, photo_url")
    .eq("id", id)
    .maybeSingle<UserRow>();
  if (error) throw error;
  return data ? toUser(data) : null;
}

/**
 * The logged-in user, or null when logged out. Falls back to the Lichess
 * identity from the cookie if the database isn't connected or fails, so
 * pages still render.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const fallback: AppUser = {
    id: session.userId,
    lichessUsername: session.username,
    displayName: session.username,
    photoUrl: null,
  };
  if (!isDbConfigured()) return fallback;

  try {
    return (await getUserById(session.userId)) ?? fallback;
  } catch (error) {
    console.error("Failed to load user", error);
    return fallback;
  }
});

export async function updateDisplayName(id: string, displayName: string): Promise<void> {
  const { error } = await db()
    .from("users")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function avatarPath(userId: string) {
  return `${userId}.jpg`;
}

export async function setUserPhoto(userId: string, jpeg: Uint8Array): Promise<void> {
  const storage = db().storage.from(AVATAR_BUCKET);
  const path = avatarPath(userId);

  const { error: uploadError } = await storage.upload(path, jpeg, {
    contentType: "image/jpeg",
    upsert: true,
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  // The file name never changes, so add a version to bust browser caches.
  const { data } = storage.getPublicUrl(path);
  const photoUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error } = await db()
    .from("users")
    .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function removeUserPhoto(userId: string): Promise<void> {
  const { error: removeError } = await db().storage.from(AVATAR_BUCKET).remove([avatarPath(userId)]);
  if (removeError) throw removeError;

  const { error } = await db()
    .from("users")
    .update({ photo_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
