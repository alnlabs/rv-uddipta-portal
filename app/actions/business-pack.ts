"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireDeskManage } from "@/lib/deskAccess";
import { canManageAdmin, canRunGate, ensureProfile } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

async function session() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const profile = await ensureProfile(user, supabase);
  const admin = createAdminClient();
  const name = profile.displayName || user.email || "A member";
  return { user, profile, admin, name, supabase };
}

export async function reviewDocumentRequest(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only society admin can review NOCs.");
  const id = Number(formData.get("id") || 0);
  const decision = String(formData.get("decision") || "").trim();
  const rejectReason = String(formData.get("rejectReason") || "").trim();
  const filePath = String(formData.get("filePath") || "").trim();
  if (!id) throw new Error("Missing request.");
  if (decision === "issued") {
    const { error } = await admin
      .from("document_requests")
      .update({
        status: "issued",
        reject_reason: null,
        file_path: filePath || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorUserId: user.id, actorName: name, action: "Issued a document / NOC", subject: String(id) });
  } else if (decision === "rejected") {
    const { error } = await admin
      .from("document_requests")
      .update({
        status: "rejected",
        reject_reason: rejectReason || "Rejected by office",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit({ actorUserId: user.id, actorName: name, action: "Rejected a document / NOC", subject: String(id) });
  } else if (decision === "under_review") {
    const { error } = await admin.from("document_requests").update({ status: "under_review" }).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    throw new Error("Choose a decision.");
  }
  revalidatePath("/account/nocs");
}

export async function requestMyDocument(formData: FormData) {
  const { supabase } = await session();
  const kind = String(formData.get("kind") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const { error } = await supabase.rpc("request_my_document", {
    kind,
    title,
    note: note || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/nocs");
  revalidatePath("/account/nocs");
}

export async function addMyWorkforce(formData: FormData) {
  const { supabase } = await session();
  const kind = String(formData.get("kind") || "domestic").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const { error } = await supabase.rpc("add_my_workforce", {
    kind,
    name,
    phone: phone || null,
    note: note || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/workforce");
  revalidatePath("/account/workforce");
}

export async function setWorkforceBlacklist(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can change blacklist.");
  }
  const id = Number(formData.get("id") || 0);
  const blacklisted = String(formData.get("blacklisted") || "") === "true";
  if (!id) throw new Error("Missing person.");
  const { error } = await admin.from("workforce_people").update({ blacklisted }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: blacklisted ? "Blacklisted a helper" : "Cleared helper blacklist",
    subject: String(id),
  });
  revalidatePath("/account/workforce");
  revalidatePath("/account/security-ops");
}

export async function postOpsLog(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "ops");
  const kind = String(formData.get("kind") || "other").trim();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 2) throw new Error("Enter a title.");
  const { error } = await admin.from("ops_logs").insert({
    kind,
    title,
    body: body || null,
    created_by: user.id,
    status: "open",
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Posted a building ops log", subject: title });
  revalidatePath("/account/ops");
  revalidatePath("/ops");
}

export async function resolveOpsLog(formData: FormData) {
  const { user, profile, admin } = await session();
  await requireDeskManage(profile.role, user, "ops");
  const id = Number(formData.get("id") || 0);
  if (!id) throw new Error("Missing log.");
  const { error } = await admin
    .from("ops_logs")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/account/ops");
  revalidatePath("/ops");
}

export async function saveAsset(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "assets");
  const assetName = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind") || "other").trim();
  const location = String(formData.get("location") || "").trim();
  if (assetName.length < 2) throw new Error("Enter an asset name.");
  const { error } = await admin.from("assets").insert({
    name: assetName,
    kind,
    location: location || null,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Added an asset", subject: assetName });
  revalidatePath("/account/assets");
}

export async function saveAmcContract(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "assets");
  const assetId = Number(formData.get("assetId") || 0);
  const vendorName = String(formData.get("vendorName") || "").trim();
  const startsOn = String(formData.get("startsOn") || "").trim();
  const endsOn = String(formData.get("endsOn") || "").trim();
  const note = String(formData.get("note") || "").trim();
  if (!assetId) throw new Error("Choose an asset.");
  if (vendorName.length < 2) throw new Error("Enter a vendor.");
  const { error } = await admin.from("amc_contracts").insert({
    asset_id: assetId,
    vendor_name: vendorName,
    starts_on: /^\d{4}-\d{2}-\d{2}$/.test(startsOn) ? startsOn : null,
    ends_on: /^\d{4}-\d{2}-\d{2}$/.test(endsOn) ? endsOn : null,
    note: note || null,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Saved an AMC contract", subject: vendorName });
  revalidatePath("/account/assets");
}

export async function publishCircular(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "circulars");
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 2 || body.length < 2) throw new Error("Enter a title and body.");
  const { error } = await admin.from("circulars").insert({
    title,
    body,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Published a circular", subject: title });
  revalidatePath("/account/circulars");
  revalidatePath("/circulars");
}

export async function ackMyCircular(formData: FormData) {
  const { supabase } = await session();
  const circularId = Number(formData.get("circularId") || 0);
  if (!circularId) throw new Error("Missing circular.");
  const { error } = await supabase.rpc("ack_my_circular", { circular_id: circularId });
  if (error) throw new Error(error.message);
  revalidatePath("/circulars");
}

export async function addBlacklistEntry(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can edit the blacklist.");
  }
  const kind = String(formData.get("kind") || "person").trim();
  const value = String(formData.get("value") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  if (value.length < 2) throw new Error("Enter a value.");
  const { error } = await admin.from("security_blacklist").insert({
    kind,
    value,
    reason: reason || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Added a blacklist entry", subject: value });
  revalidatePath("/account/security-ops");
}

export async function setBlacklistActive(formData: FormData) {
  const { user, profile, admin } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can edit the blacklist.");
  }
  const id = Number(formData.get("id") || 0);
  const active = String(formData.get("active") || "") === "true";
  if (!id) throw new Error("Missing entry.");
  const { error } = await admin.from("security_blacklist").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/account/security-ops");
}

export async function createMaterialExit(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    await requireDeskManage(profile.role, user, "security_ops");
  }
  const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
  const description = String(formData.get("description") || "").trim();
  const carrierName = String(formData.get("carrierName") || "").trim();
  const vehicle = String(formData.get("vehicle") || "").trim();
  if (description.length < 2) throw new Error("Describe the material.");
  let flatId: number | null = null;
  if (flatNumber) {
    const { data: flat } = await admin.from("flats").select("id").eq("flat_number", flatNumber).maybeSingle();
    flatId = flat?.id ?? null;
  }
  const { error } = await admin.from("material_exits").insert({
    flat_id: flatId,
    flat_number: flatNumber || null,
    description,
    carrier_name: carrierName || null,
    vehicle: vehicle || null,
    created_by: user.id,
    status: "open",
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Logged a material exit", subject: description });
  revalidatePath("/account/security-ops");
}

export async function decideMaterialExit(formData: FormData) {
  const { user, profile, admin } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can decide material exit.");
  }
  const id = Number(formData.get("id") || 0);
  const status = String(formData.get("status") || "").trim();
  if (!id || !["allowed", "stopped", "done"].includes(status)) throw new Error("Choose a decision.");
  const { error } = await admin
    .from("material_exits")
    .update({ status, decided_by: user.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/account/security-ops");
}

export async function createIncident(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can log incidents.");
  }
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const severity = String(formData.get("severity") || "low").trim();
  if (title.length < 2) throw new Error("Enter a title.");
  const { error } = await admin.from("security_incidents").insert({
    title,
    body: body || null,
    severity: ["low", "medium", "high"].includes(severity) ? severity : "low",
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Logged a security incident", subject: title });
  revalidatePath("/account/security-ops");
}

export async function closeIncident(formData: FormData) {
  const { user, profile, admin } = await session();
  if (!canManageAdmin(profile.role, user) && !canRunGate(profile.role, user)) {
    throw new Error("Only office or security can close incidents.");
  }
  const id = Number(formData.get("id") || 0);
  if (!id) throw new Error("Missing incident.");
  const { error } = await admin
    .from("security_incidents")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/account/security-ops");
}

export async function setBaySticker(formData: FormData) {
  const { user, profile, admin } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can set stickers.");
  const bayId = Number(formData.get("bayId") || 0);
  const sticker = String(formData.get("sticker") || "").trim();
  if (!bayId) throw new Error("Missing bay.");
  const { error } = await admin.from("parking_bays").update({ sticker: sticker || null }).eq("id", bayId);
  if (error) throw new Error(error.message);
  revalidatePath("/account/parking");
  revalidatePath("/parking");
}
