import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export function assertProfilePhotoFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error("Photo must be 5 MB or smaller.");
  }
}

export function profilePhotoObjectPath(
  flatId: number,
  kind: "owner" | "member",
  memberId?: number,
) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (kind === "owner") {
    return `flat-${flatId}/owner/${stamp}`;
  }
  if (memberId == null) {
    throw new Error("Member id is required for member photos.");
  }
  return `flat-${flatId}/members/${memberId}/${stamp}`;
}

export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  file: File,
  flatId: number,
  kind: "owner" | "member",
  memberId?: number,
) {
  assertProfilePhotoFile(file);
  const base = profilePhotoObjectPath(flatId, kind, memberId);
  const path = `${base}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw error;
  const { data } = supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function removeProfilePhotoObject(
  supabase: SupabaseClient,
  photoUrl: string | null | undefined,
) {
  if (!photoUrl) return;
  const marker = `/object/public/${PROFILE_PHOTO_BUCKET}/`;
  const idx = photoUrl.indexOf(marker);
  if (idx < 0) return;
  const path = decodeURIComponent(photoUrl.slice(idx + marker.length));
  if (!path.startsWith("flat-")) return;
  await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([path]);
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
