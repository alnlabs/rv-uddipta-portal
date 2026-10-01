"use server";

import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";

export type VisitState = { ok: boolean; message: string };

export async function bookVisit(
  _prev: VisitState,
  formData: FormData,
): Promise<VisitState> {
  const name = String(formData.get("name") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const note = String(formData.get("note") || "").trim();

  if (name.length < 2) return { ok: false, message: "Enter your name." };
  if (!phone) return { ok: false, message: "Enter a valid 10-digit phone number." };

  const admin = createAdminClient();
  const { error } = await admin.from("visit_requests").insert({
    name,
    phone,
    note: note || null,
  });
  if (error) return { ok: false, message: "Could not send that. Try again." };

  return {
    ok: true,
    message: "Sent. Someone from the building will call you.",
  };
}
