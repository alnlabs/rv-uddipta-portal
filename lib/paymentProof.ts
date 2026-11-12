import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

const BUCKET = "payment-proofs";
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export async function savePaymentProof(flatId: number, file: File) {
  const ext = TYPES.get(file.type);
  if (!ext) throw new Error("Use a JPEG, PNG, WebP screenshot, or a PDF.");
  if (file.size > MAX_BYTES) throw new Error("Proof must be 8 MB or smaller.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${flatId}/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Could not save the proof. Try again.");
  return path;
}

export async function signedProofUrl(path: string | null | undefined) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
