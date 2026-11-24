"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deletePhoto, saveDisplayName, savePhoto } from "@/app/settings/actions";
import type { AppUser, FormState } from "@/lib/types";
import { Avatar } from "./Avatar";
import { buttonPrimary, buttonSecondary, card, input, muted } from "./ui";

const AVATAR_SIZE = 256;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/** Centre-crops the picked image to a square and re-encodes it as a small JPEG. */
async function toAvatarJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      "image/jpeg",
      0.85,
    ),
  );
}

function Message({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
        {state.ok}
      </p>
    );
  }
  return null;
}

export function SettingsForm({ user }: { user: AppUser }) {
  const [nameState, nameAction, namePending] = useActionState(saveDisplayName, {});

  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [photoState, setPhotoState] = useState<FormState>({});
  const [photoPending, startPhotoTransition] = useTransition();

  // Free the preview's object URL when it is replaced or the page unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_SOURCE_BYTES) {
      setPhotoState({ error: "That file is over 15 MB." });
      return;
    }
    try {
      const blob = await toAvatarJpeg(file);
      setPreview({ url: URL.createObjectURL(blob), blob });
      setPhotoState({});
    } catch {
      setPhotoState({ error: "Couldn't read that image. Try a JPG or PNG." });
    }
  }

  function onSavePhoto() {
    if (!preview) return;
    const formData = new FormData();
    formData.append("photo", preview.blob, "avatar.jpg");
    startPhotoTransition(async () => {
      const result = await savePhoto(formData);
      setPhotoState(result);
      if (result.ok) setPreview(null);
    });
  }

  function onRemovePhoto() {
    startPhotoTransition(async () => {
      setPhotoState(await deletePhoto());
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className={card} aria-labelledby="name-heading">
        <h2 id="name-heading" className="text-base font-semibold">
          Display name
        </h2>
        <p className={`${muted} mt-1`}>Shown to other players in lobbies and brackets.</p>
        <form action={nameAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor="displayName" className="sr-only">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={user.displayName}
              minLength={2}
              maxLength={24}
              required
              autoComplete="nickname"
              className={input}
            />
          </div>
          <button type="submit" disabled={namePending} className={buttonPrimary}>
            {namePending ? "Saving…" : "Save name"}
          </button>
        </form>
        <div className="mt-2 min-h-5">
          <Message state={nameState} />
        </div>
      </section>

      <section className={card} aria-labelledby="photo-heading">
        <h2 id="photo-heading" className="text-base font-semibold">
          Profile photo
        </h2>
        <p className={`${muted} mt-1`}>Square photos look best. We shrink it to 256 × 256.</p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt="New photo preview"
              width={72}
              height={72}
              className="size-18 rounded-full object-cover ring-2 ring-emerald-600"
            />
          ) : (
            <Avatar name={user.displayName} photoUrl={user.photoUrl} size={72} alt="Your photo" />
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onPick}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />

          <div className="flex flex-wrap gap-2">
            {preview ? (
              <>
                <button
                  type="button"
                  onClick={onSavePhoto}
                  disabled={photoPending}
                  className={buttonPrimary}
                >
                  {photoPending ? "Uploading…" : "Save photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={photoPending}
                  className={buttonSecondary}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={photoPending}
                  className={buttonSecondary}
                >
                  {user.photoUrl ? "Change photo" : "Upload photo"}
                </button>
                {user.photoUrl && (
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    disabled={photoPending}
                    className={buttonSecondary}
                  >
                    {photoPending ? "Removing…" : "Remove"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-2 min-h-5">
          <Message state={photoState} />
        </div>
      </section>
    </div>
  );
}
