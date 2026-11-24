"use server";

import { revalidatePath } from "next/cache";
import { ensureUserRow, requireSession } from "@/lib/auth";
import { isDbConfigured } from "@/lib/env";
import type { FormState } from "@/lib/types";
import { removeUserPhoto, setUserPhoto, updateDisplayName } from "@/lib/users";

// Letters (any language), marks, digits, spaces and . _ ' -
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}\p{N} ._'-]+$/u;
const MAX_PHOTO_BYTES = 300 * 1024; // the browser shrinks photos to ~256px first

export async function saveDisplayName(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return { error: "The database isn't connected yet." };

  const name = String(formData.get("displayName") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24) {
    return { error: "Name must be 2–24 characters." };
  }
  if (!DISPLAY_NAME_PATTERN.test(name)) {
    return { error: "Use letters, numbers, spaces and . _ ' - only." };
  }

  try {
    await ensureUserRow(session);
    await updateDisplayName(session.userId, name);
  } catch (error) {
    console.error("Saving display name failed", error);
    return { error: "Couldn't save. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: "Name saved." };
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function savePhoto(formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return { error: "The database isn't connected yet." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "That photo is too large." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) {
    return { error: "Unsupported image." };
  }

  try {
    await ensureUserRow(session);
    await setUserPhoto(session.userId, bytes);
  } catch (error) {
    console.error("Saving photo failed", error);
    return { error: "Couldn't upload the photo. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: "Photo saved." };
}

export async function deletePhoto(): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return { error: "The database isn't connected yet." };

  try {
    await ensureUserRow(session);
    await removeUserPhoto(session.userId);
  } catch (error) {
    console.error("Removing photo failed", error);
    return { error: "Couldn't remove the photo. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: "Photo removed." };
}
