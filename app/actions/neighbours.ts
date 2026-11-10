"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireDeskManage } from "@/lib/deskAccess";
import { pushHome } from "@/lib/push";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

async function myFlatNumber(flatId: number | null) {
  if (!flatId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("flats").select("flat_number").eq("id", flatId).maybeSingle();
  return data?.flat_number ? String(data.flat_number) : null;
}

export async function requestNeighbourConnect(formData: FormData) {
  const { user, profile } = await getAuthState();
  if (!user || !profile) throw new Error("Sign in first.");
  await requireDeskManage(profile.role, user, "neighbours");
  if (!profile.flatId) throw new Error("Link your home before connecting with a neighbour.");

  const home = String(formData.get("home") || "").trim().toUpperCase();
  const note = String(formData.get("note") || "").trim().slice(0, 280);
  if (!home) throw new Error("Choose a home.");

  const admin = createAdminClient();
  const name = profile.displayName || user.email || "A member";
  const mine = await myFlatNumber(profile.flatId);
  const { data: target } = await admin
    .from("flats")
    .select("id, flat_number, owner_name, sale_status")
    .eq("flat_number", home)
    .maybeSingle();
  if (!target?.owner_name || target.sale_status !== "sold") {
    throw new Error("That home is not in the directory.");
  }
  if (target.id === profile.flatId) throw new Error("That is your own home.");

  const { data: open } = await admin
    .from("connection_requests")
    .select("id, status")
    .eq("from_user_id", user.id)
    .eq("to_flat_id", target.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();
  if (open?.status === "accepted") throw new Error("You are already connected.");
  if (open?.status === "pending") throw new Error("Your connect request is waiting.");

  const { error } = await admin.from("connection_requests").insert({
    from_user_id: user.id,
    from_flat_id: profile.flatId,
    to_flat_id: target.id,
    note: note || null,
    status: "pending",
  });
  if (error) {
    if (/connection_requests/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      throw new Error("Connect is not ready on the database yet. Apply the latest migration.");
    }
    throw new Error(error.message);
  }

  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Asked to connect",
    subject: String(target.flat_number),
  });
  await pushHome({
    flatId: target.id as number,
    title: "Neighbour wants to connect",
    body: note
      ? `${mine || "A neighbour"} (${name}): ${note}`
      : `${name} from ${mine || "a nearby home"} asked to connect.`,
    href: `/members?q=${encodeURIComponent(String(mine || ""))}`,
    kind: "connect",
  });
  revalidatePath("/members");
}

export async function answerNeighbourConnect(formData: FormData) {
  const { user, profile } = await getAuthState();
  if (!user || !profile) throw new Error("Sign in first.");
  await requireDeskManage(profile.role, user, "neighbours");
  if (!profile.flatId) throw new Error("Link your home first.");

  const requestId = Number(formData.get("requestId") || 0);
  const decision = String(formData.get("decision") || "");
  if (!requestId || !["accepted", "refused"].includes(decision)) {
    throw new Error("Choose accept or decline.");
  }

  const admin = createAdminClient();
  const name = profile.displayName || user.email || "A member";
  const mine = await myFlatNumber(profile.flatId);
  const { data: row } = await admin
    .from("connection_requests")
    .select("id, status, from_user_id, from_flat_id, to_flat_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!row || row.status !== "pending") throw new Error("That request is no longer open.");
  if (row.to_flat_id !== profile.flatId) throw new Error("Only that home can answer this request.");

  const { error } = await admin
    .from("connection_requests")
    .update({ status: decision, answered_at: new Date().toISOString(), answered_by: user.id })
    .eq("id", row.id);
  if (error) throw new Error(error.message);

  const { data: fromFlat } = await admin.from("flats").select("flat_number").eq("id", row.from_flat_id).maybeSingle();
  await pushHome({
    hostUserId: row.from_user_id,
    flatId: row.from_flat_id,
    title: decision === "accepted" ? "Neighbour connected" : "Connect request declined",
    body: decision === "accepted"
      ? `${mine} accepted your connect request.`
      : `${mine} declined your connect request.`,
    href: `/members?q=${encodeURIComponent(String(fromFlat?.flat_number || ""))}`,
    kind: "connect",
  });
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: decision === "accepted" ? "Accepted a connect request" : "Declined a connect request",
    subject: String(fromFlat?.flat_number || row.id),
  });
  revalidatePath("/members");
}
