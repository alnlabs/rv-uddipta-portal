import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "post-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function savePostPhoto(postId: number, file: File) {
  return savePhoto(`posts/${postId}`, file);
}

export async function saveNotePhoto(noteId: number, file: File) {
  return savePhoto(`notes/${noteId}`, file);
}

async function savePhoto(folder: string, file: File) {
  const ext = TYPES.get(file.type);
  if (!ext) throw new Error("Use a JPEG, PNG, or WebP photo.");
  if (file.size > MAX_BYTES) throw new Error("Photo must be 5 MB or smaller.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${folder}/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Could not save the photo. Try again.");
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
