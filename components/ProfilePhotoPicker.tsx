"use client";

import { useRef, useState } from "react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { cleanError } from "@/lib/auth";
import {
  PROFILE_PHOTO_ACCEPT,
  removeProfilePhotoObject,
  uploadProfilePhoto,
} from "@/lib/profilePhoto";
import { createClient } from "@/utils/supabase/client";

export function ProfilePhotoPicker({
  name,
  photoUrl,
  flatId,
  kind,
  memberId,
  onChange,
  tone = "owner",
  size = "lg",
}: {
  name: string
  photoUrl: string | null
  flatId: number
  kind: "owner" | "member"
  memberId?: number
  onChange: (nextUrl: string | null) => void
  tone?: "owner" | "member"
  size?: "md" | "lg"
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const url = await uploadProfilePhoto(
        supabase,
        file,
        flatId,
        kind,
        memberId,
      );
      if (photoUrl) {
        await removeProfilePhotoObject(supabase, photoUrl);
      }
      onChange(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? cleanError(err.message)
          : "Could not upload photo",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      await removeProfilePhotoObject(supabase, photoUrl);
      onChange(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? cleanError(err.message)
          : "Could not remove photo",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ProfileAvatar name={name} photoUrl={photoUrl} size={size} tone={tone} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="min-h-9 rounded-full bg-[#1b3a2f] px-3.5 text-xs font-semibold text-[#e8d5a3] disabled:opacity-65"
          >
            {busy ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
          </button>
          {photoUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              className="min-h-9 rounded-full px-3.5 text-xs font-semibold text-[#8a2f2f] disabled:opacity-65"
            >
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-[#3d5247]">JPEG, PNG, WebP or GIF · max 5 MB</p>
        {error ? (
          <p role="alert" className="text-xs text-[#8a2f2f]">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
