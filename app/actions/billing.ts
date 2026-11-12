"use server";

import { revalidatePath } from "next/cache";
import { savePaymentProof } from "@/lib/paymentProof";
import { requireAdminUser } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function postDuesRun(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const period = String(formData.get("period") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const feeHeadKey = String(formData.get("feeHeadKey") || "maintenance").trim();
  const dueOn = String(formData.get("dueOn") || "").trim();
  const { error } = await admin.rpc("post_dues_run", {
    period,
    title: title || null,
    fee_head_key: feeHeadKey,
    due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueOn) ? dueOn : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/account/billing");
}

export async function recordPayment(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const invoiceId = Number(formData.get("invoiceId") || 0);
  const rupees = Number(String(formData.get("amount") || "").replace(/,/g, ""));
  const method = String(formData.get("method") || "offline");
  const reference = String(formData.get("reference") || "").trim();
  const file = formData.get("proof");
  if (!invoiceId) throw new Error("Choose an invoice.");
  if (!Number.isFinite(rupees) || rupees <= 0) throw new Error("Enter amount in rupees.");

  let proofPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const { data: invoice } = await admin.from("invoices").select("flat_id").eq("id", invoiceId).maybeSingle();
    if (!invoice?.flat_id) throw new Error("Invoice not found.");
    proofPath = await savePaymentProof(Number(invoice.flat_id), file);
  }

  const { error } = await admin.rpc("record_invoice_payment", {
    invoice_id: invoiceId,
    amount_paise: Math.round(rupees * 100),
    method,
    reference: reference || null,
    proof_path: proofPath,
    proof_url: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/account/billing");
  revalidatePath("/billing");
}

export async function confirmPendingPayment(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const paymentId = Number(formData.get("paymentId") || 0);
  if (!paymentId) throw new Error("Missing payment.");
  const { error } = await admin.rpc("confirm_pending_payment", { payment_id: paymentId });
  if (error) throw new Error(error.message);
  revalidatePath("/account/billing");
  revalidatePath("/billing");
}

export async function rejectPendingPayment(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const paymentId = Number(formData.get("paymentId") || 0);
  const reason = String(formData.get("reason") || "").trim();
  if (!paymentId) throw new Error("Missing payment.");
  const { error } = await admin.rpc("reject_pending_payment", {
    payment_id: paymentId,
    reason: reason || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/account/billing");
  revalidatePath("/billing");
}

export async function saveFeeHead(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const key = String(formData.get("key") || "maintenance").trim().toLowerCase().replace(/\s+/g, "_");
  const label = String(formData.get("label") || "").trim();
  const rupees = Number(String(formData.get("amount") || "").replace(/,/g, ""));
  if (!label) throw new Error("Enter a fee label.");
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error("Enter amount in rupees.");
  const { error } = await admin.from("fee_heads").upsert({
    key,
    label,
    amount_paise: Math.round(rupees * 100),
    active: true,
  }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/account/billing");
}

export async function submitResidentPaymentProof(formData: FormData) {
  const { cookies } = await import("next/headers");
  const { createClient } = await import("@/utils/supabase/server");
  const { ensureProfile } = await import("@/lib/roles");
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const profile = await ensureProfile(user, supabase);
  if (!profile.flatId) throw new Error("Link a home first.");

  const invoiceId = Number(formData.get("invoiceId") || 0);
  const rupees = Number(String(formData.get("amount") || "").replace(/,/g, ""));
  const method = String(formData.get("method") || "upi");
  const reference = String(formData.get("reference") || "").trim();
  const file = formData.get("proof");
  if (!invoiceId) throw new Error("Choose an invoice.");
  if (!Number.isFinite(rupees) || rupees <= 0) throw new Error("Enter amount in rupees.");
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Attach a screenshot or PDF proof.");
  }

  const proofPath = await savePaymentProof(profile.flatId, file);
  const { error } = await supabase.rpc("submit_my_payment_proof", {
    invoice_id: invoiceId,
    amount_paise: Math.round(rupees * 100),
    proof_path: proofPath,
    method,
    reference: reference || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/billing");
  revalidatePath("/account/billing");
}
