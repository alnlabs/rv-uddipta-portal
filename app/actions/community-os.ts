"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { pushHome } from "@/lib/push";
import { bookingSlot } from "@/lib/bookingSlots";
import { requireDeskManage } from "@/lib/deskAccess";
import { homeForRole } from "@/lib/heldRoles";
import { isSuperAdmin } from "@/lib/admin";
import { FEATURE_CATALOG } from "@/lib/features";
import {
  canDoStaffWork,
  canManageAdmin,
  canRunFacility,
  canRunGate,
  canSitCommittee,
  ensureProfile,
  isCommunityRole,
} from "@/lib/roles";
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
  return { user, profile, admin, name };
}

export async function switchRole(formData: FormData) {
  const { user, admin } = await session();
  if (isSuperAdmin(user)) return;
  const role = String(formData.get("role") || "");
  const { data: row } = await admin
    .from("person_roles")
    .select("role, flat_id")
    .eq("user_id", user.id)
    .eq("role", role)
    .maybeSingle();
  if (!row) throw new Error("That role is not on this account.");
  const { error } = await admin
    .from("profiles")
    .update({ role: row.role, flat_id: row.flat_id })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  await admin.from("flats").update({ user_id: null }).eq("user_id", user.id);
  if (row.role === "owner" && row.flat_id) {
    await admin.from("flats").update({ user_id: user.id }).eq("id", row.flat_id);
  }
  revalidatePath("/", "layout");
  redirect(homeForRole(String(row.role)));
}

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 8; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

export async function setFeatureEnabled(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can change features.");
  const key = String(formData.get("key") || "");
  const enabled = String(formData.get("enabled") || "") === "true";
  if (!FEATURE_CATALOG.some((item) => item.key === key)) return;
  await admin.from("community_features").upsert({
    key,
    label: FEATURE_CATALOG.find((item) => item.key === key)?.label || key,
    feature_group: FEATURE_CATALOG.find((item) => item.key === key)?.group || "Community",
    summary: FEATURE_CATALOG.find((item) => item.key === key)?.summary || "",
    enabled,
  });
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: enabled ? "Turned a feature on" : "Turned a feature off",
    subject: key,
  });
  revalidatePath("/", "layout");
}

export async function saveCategory(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can change categories.");
  const id = Number(formData.get("id") || 0);
  const label = String(formData.get("label") || "").trim();
  const enabled = formData.get("enabled") === "on";
  if (id && label) {
    await admin.from("categories").update({ label, enabled }).eq("id", id);
  } else {
    const moduleName = String(formData.get("module") || "community");
    const value = String(formData.get("value") || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!value || !label) return;
    if (moduleName !== "community" && moduleName !== "request") return;
    await admin.from("categories").insert({
      module: moduleName,
      value,
      label,
      enabled: true,
      sort_order: 200,
    });
  }
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Updated a category", subject: label });
  revalidatePath("/account/categories");
  revalidatePath("/feed");
  revalidatePath("/requests");
  revalidatePath("/account/requests");
}

export async function setNoteStatus(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can update a request.");
  const id = Number(formData.get("noteId"));
  const status = String(formData.get("status") || "");
  if (!id || !["new", "in_progress", "waiting", "done"].includes(status)) return;
  await admin.from("member_notes").update({ status }).eq("id", id);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Updated a request",
    subject: String(id),
    detail: status,
  });
  revalidatePath("/account/requests");
  revalidatePath("/requests");
}

export async function createVisitorPass(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "visitor_passes");
  if (!isCommunityRole(profile.role) || !profile.flatId) {
    throw new Error("Link a home before creating a pass.");
  }
  const visitorName = String(formData.get("visitorName") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const visitOn = String(formData.get("visitOn") || "").trim();
  if (visitorName.length < 2) throw new Error("Enter the visitor's name.");
  const { data: flat } = await admin
    .from("flats")
    .select("flat_number")
    .eq("id", profile.flatId)
    .maybeSingle();
  const { data: settings } = await admin
    .from("project_info")
    .select("host_approval")
    .eq("id", 1)
    .maybeSingle();
  const status = settings?.host_approval ? "pending_approval" : "expected";
  const { error } = await admin.from("visitor_passes").insert({
    code: code(),
    flat_id: profile.flatId,
    flat_number: flat?.flat_number || "",
    host_user_id: user.id,
    visitor_name: visitorName,
    visitor_phone: phone || null,
    purpose,
    visit_on: /^\d{4}-\d{2}-\d{2}$/.test(visitOn) ? visitOn : new Date().toISOString().slice(0, 10),
    status,
  });
  if (error) throw new Error(error.message);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Created a visitor pass",
    subject: visitorName,
    detail: flat?.flat_number || "",
  });
  revalidatePath("/visitors");
  revalidatePath("/gate");
}

export async function decideVisitorPass(formData: FormData) {
  const { user, profile, admin, name } = await session();
  const id = Number(formData.get("passId"));
  const next = String(formData.get("status") || "");
  if (!id || !["expected", "refused", "waiting", "inside", "left"].includes(next)) return;
  const { data: pass } = await admin.from("visitor_passes").select("*").eq("id", id).maybeSingle();
  if (!pass) return;
  const host = pass.host_user_id === user.id;
  const gate = canRunGate(profile.role, user);
  if (host) await requireDeskManage(profile.role, user, "visitor_passes");
  if (!host) await requireDeskManage(profile.role, user, "gate");
  if (next === "expected" || next === "refused") {
    if (!host && !canManageAdmin(profile.role, user)) throw new Error("Only the host can approve this pass.");
  } else if (!gate) {
    throw new Error("Only security can update the gate.");
  }
  let bayId = pass.bay_id;
  if (next === "inside" && !bayId) {
    const { data: bays } = await admin.from("parking_bays").select("id").eq("kind", "visitor");
    const { data: used } = await admin
      .from("visitor_passes")
      .select("bay_id")
      .eq("status", "inside")
      .not("bay_id", "is", null);
    const taken = new Set((used ?? []).map((row) => row.bay_id));
    bayId = (bays ?? []).find((bay) => !taken.has(bay.id))?.id ?? null;
  }
  if (next === "left") bayId = null;
  await admin.from("visitor_passes").update({ status: next, bay_id: bayId }).eq("id", id);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: next === "inside" ? "Let a visitor in" : next === "left" ? "Marked a visitor out" : "Updated a visitor pass",
    subject: pass.visitor_name,
    detail: pass.flat_number,
  });
  if (next === "waiting") {
    await pushHome({
      flatId: pass.flat_id,
      hostUserId: pass.host_user_id,
      title: "Visitor at the gate",
      body: `${pass.visitor_name} is waiting for ${pass.flat_number}.`,
    });
  }
  revalidatePath("/visitors");
  revalidatePath("/gate");
  revalidatePath("/parking");
  revalidatePath(`/pass/${pass.code}`);
}

export async function walkInVisitor(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "gate");
  if (!canRunGate(profile.role, user)) throw new Error("Only security can log a walk-in.");
  const visitorName = String(formData.get("visitorName") || "").trim();
  const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
  const purpose = String(formData.get("purpose") || "").trim();
  if (visitorName.length < 2 || !flatNumber) throw new Error("Enter a name and a home.");
  const { data: flat } = await admin.from("flats").select("id, flat_number").eq("flat_number", flatNumber).maybeSingle();
  if (!flat) throw new Error("That home is not in the brochure.");
  await admin.from("visitor_passes").insert({
    code: code(),
    flat_id: flat.id,
    flat_number: flat.flat_number,
    visitor_name: visitorName,
    purpose: purpose || "Walk-in",
    visit_on: new Date().toISOString().slice(0, 10),
    status: "waiting",
  });
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Logged a walk-in",
    subject: visitorName,
    detail: flat.flat_number,
  });
  await pushHome({
    flatId: flat.id,
    title: "Visitor at the gate",
    body: `${visitorName} is waiting for ${flat.flat_number}.`,
  });
  revalidatePath("/gate");
}

export async function saveVehicle(formData: FormData) {
  const { user, profile, admin } = await session();
  await requireDeskManage(profile.role, user, "parking");
  if (!profile.flatId) throw new Error("Link a home first.");
  if (!isCommunityRole(profile.role)) throw new Error("You cannot add a vehicle.");
  const plate = String(formData.get("plate") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  if (plate.length < 4) throw new Error("Enter the vehicle number.");
  await admin.from("vehicles").insert({ flat_id: profile.flatId, plate, label: label || "Car" });
  revalidatePath("/parking");
  revalidatePath("/account/parking");
}

export async function removeVehicle(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "parking");
  const vehicleId = Number(formData.get("vehicleId"));
  if (!vehicleId) return;
  const { data: vehicle } = await admin.from("vehicles").select("id, flat_id, plate").eq("id", vehicleId).maybeSingle();
  if (!vehicle) return;
  const office = canManageAdmin(profile.role, user);
  if (!office && vehicle.flat_id !== profile.flatId) throw new Error("You can remove a vehicle for your own home.");
  await admin.from("vehicles").delete().eq("id", vehicleId);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Removed a vehicle", subject: vehicle.plate });
  revalidatePath("/parking");
  revalidatePath("/account/parking");
}

export async function setParkingBay(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can change a bay.");
  const bayId = Number(formData.get("bayId"));
  const mode = String(formData.get("mode") || "");
  if (!bayId) return;
  const { count } = await admin
    .from("visitor_passes")
    .select("id", { count: "exact", head: true })
    .eq("bay_id", bayId)
    .eq("status", "inside");
  if ((count ?? 0) > 0 && mode !== "visitor") {
    throw new Error("A visitor is in this bay. Free it at the gate first.");
  }
  if (mode === "remove") {
    await admin.from("parking_bays").delete().eq("id", bayId);
    await writeAudit({ actorUserId: user.id, actorName: name, action: "Removed a parking bay", subject: String(bayId) });
  } else if (mode === "visitor") {
    await admin.from("parking_bays").update({ kind: "visitor", flat_id: null }).eq("id", bayId);
    await writeAudit({ actorUserId: user.id, actorName: name, action: "Set a bay for visitors", subject: String(bayId) });
  } else if (mode === "home") {
    const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
    if (!flatNumber) throw new Error("Enter the home number for this bay.");
    const { data: flat } = await admin.from("flats").select("id, flat_number").eq("flat_number", flatNumber).maybeSingle();
    if (!flat) throw new Error("That home is not in the brochure.");
    await admin.from("parking_bays").update({ kind: "resident", flat_id: flat.id }).eq("id", bayId);
    await writeAudit({
      actorUserId: user.id,
      actorName: name,
      action: "Gave a bay to a home",
      subject: flat.flat_number,
    });
  }
  revalidatePath("/parking");
  revalidatePath("/account/parking");
}

export async function addParkingBay(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can add a bay.");
  const label = String(formData.get("label") || "").trim();
  const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
  if (!label) return;
  let flatId: number | null = null;
  if (flatNumber) {
    const { data: flat } = await admin.from("flats").select("id").eq("flat_number", flatNumber).maybeSingle();
    if (!flat) throw new Error("That home is not in the brochure.");
    flatId = flat.id;
  }
  await admin.from("parking_bays").insert({
    label,
    kind: flatId ? "resident" : "visitor",
    flat_id: flatId,
  });
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Added a parking bay", subject: label });
  revalidatePath("/parking");
  revalidatePath("/account/parking");
}

export async function bookAmenity(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "amenities");
  if (!isCommunityRole(profile.role)) throw new Error("Sign in as a resident first.");
  const amenityId = Number(formData.get("amenityId"));
  const startsOn = String(formData.get("startsOn") || "");
  const slot = String(formData.get("slot") || "").trim();
  if (!amenityId || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !bookingSlot(slot)) {
    throw new Error("Choose a space, a date, and a time.");
  }
  if (await slotTaken(admin, amenityId, startsOn, slot)) {
    throw new Error("That time is already taken. Choose another.");
  }
  let flatNumber: string | null = null;
  if (profile.flatId) {
    const { data: flat } = await admin.from("flats").select("flat_number").eq("id", profile.flatId).maybeSingle();
    flatNumber = flat?.flat_number ?? null;
  }
  const { error } = await admin.from("amenity_bookings").insert({
    amenity_id: amenityId,
    flat_id: profile.flatId,
    flat_number: flatNumber,
    user_id: user.id,
    resident_name: name,
    starts_on: startsOn,
    slot,
    status: "pending",
  });
  if (error) {
    throw new Error(error.code === "23505" ? "That time is already taken. Choose another." : error.message);
  }
  revalidatePath("/amenities");
}

export async function decideBooking(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "amenities");
  if (!canManageAdmin(profile.role, user) && profile.role !== "facility") {
    throw new Error("Only the office can confirm a booking.");
  }
  const id = Number(formData.get("bookingId"));
  const status = String(formData.get("status") || "");
  if (!id || (status !== "confirmed" && status !== "refused")) return;
  if (status === "confirmed") {
    const { data: booking } = await admin
      .from("amenity_bookings")
      .select("amenity_id, starts_on, slot")
      .eq("id", id)
      .maybeSingle();
    if (
      booking &&
      (await slotTaken(admin, booking.amenity_id, booking.starts_on, booking.slot, id))
    ) {
      throw new Error("That time is already taken. Refuse this one.");
    }
  }
  const { error } = await admin.from("amenity_bookings").update({ status }).eq("id", id);
  if (error) {
    throw new Error(error.code === "23505" ? "That time is already taken." : error.message);
  }
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: status === "confirmed" ? "Confirmed a booking" : "Refused a booking",
    subject: String(id),
  });
  revalidatePath("/amenities");
}

export async function saveAmenityHours(formData: FormData) {
  const { user, profile, admin } = await session();
  await requireDeskManage(profile.role, user, "amenities");
  if (!canManageAdmin(profile.role, user) && profile.role !== "facility") return;
  const id = Number(formData.get("amenityId"));
  const hours = String(formData.get("hours") || "").trim();
  if (!id) return;
  await admin.from("amenities").update({ hours_note: hours }).eq("id", id);
  revalidatePath("/amenities");
}

async function slotTaken(
  admin: ReturnType<typeof createAdminClient>,
  amenityId: number,
  startsOn: string,
  slot: string,
  exceptId?: number,
) {
  const { data } = await admin
    .from("amenity_bookings")
    .select("id")
    .eq("amenity_id", amenityId)
    .eq("starts_on", startsOn)
    .eq("slot", slot)
    .in("status", ["pending", "confirmed"]);
  return (data ?? []).some((row) => row.id !== exceptId);
}

export async function assignRequest(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can assign a request.");
  const noteId = Number(formData.get("noteId"));
  const assignee = String(formData.get("assignee") || "");
  if (!noteId || !assignee) throw new Error("Choose the person doing the work.");
  const { data: note } = await admin
    .from("member_notes")
    .select("id, body, flat_number, status")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) return;
  const { data: existing } = await admin
    .from("work_orders")
    .select("id")
    .eq("source_note_id", noteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    await admin.from("work_orders").update({ assignee_user_id: assignee, status: "in_progress" }).eq("id", existing.id);
  } else {
    await admin.from("work_orders").insert({
      title: String(note.body).slice(0, 80),
      place: note.flat_number || "",
      body: note.body,
      source_note_id: noteId,
      assignee_user_id: assignee,
      status: "in_progress",
    });
  }
  await admin.from("member_notes").update({ status: "in_progress" }).eq("id", noteId);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Assigned a request",
    subject: String(noteId),
    detail: assignee,
  });
  revalidatePath("/account/requests");
  revalidatePath("/requests");
  revalidatePath("/account/jobs");
  revalidatePath("/work");
}

export async function createWorkOrder(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "maintenance");
  if (!canRunFacility(profile.role, user)) throw new Error("Only the facility desk can open a job.");
  const title = String(formData.get("title") || "").trim();
  const place = String(formData.get("place") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const noteId = Number(formData.get("noteId") || 0);
  if (title.length < 2) throw new Error("Name the job.");
  await admin.from("work_orders").insert({
    title,
    place,
    body,
    source_note_id: noteId || null,
    status: "open",
  });
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Opened a job", subject: title, detail: place });
  revalidatePath("/account/jobs");
  revalidatePath("/work");
  revalidatePath("/account/requests");
}

export async function assignWorkOrder(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "maintenance");
  if (!canRunFacility(profile.role, user)) throw new Error("Only the facility desk can assign a job.");
  const id = Number(formData.get("jobId"));
  const assignee = String(formData.get("assignee") || "");
  const status = String(formData.get("status") || "");
  if (!id) return;
  const patch: { assignee_user_id?: string | null; status?: string } = {};
  if (assignee) patch.assignee_user_id = assignee;
  if (["open", "in_progress", "done"].includes(status)) patch.status = status;
  await admin.from("work_orders").update(patch).eq("id", id);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Updated a job", subject: String(id), detail: status });
  revalidatePath("/account/jobs");
  revalidatePath("/work");
}

export async function updateMyJob(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "maintenance");
  if (!canDoStaffWork(profile.role, user)) throw new Error("This desk is for service staff.");
  const id = Number(formData.get("jobId"));
  const status = String(formData.get("status") || "");
  if (!id || !["in_progress", "done"].includes(status)) return;
  const { data: job } = await admin.from("work_orders").select("assignee_user_id, title").eq("id", id).maybeSingle();
  if (!job) return;
  if (profile.role === "staff" && job.assignee_user_id !== user.id) {
    throw new Error("This job is not yours.");
  }
  await admin.from("work_orders").update({ status }).eq("id", id);
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Updated a job", subject: job.title, detail: status });
  revalidatePath("/work");
  revalidatePath("/account/jobs");
}

export async function saveCommitteeItem(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "committee");
  if (!canSitCommittee(profile.role, user)) throw new Error("Only the committee can record a decision.");
  const id = Number(formData.get("itemId") || 0);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const kind = String(formData.get("kind") || "policy");
  const decision = String(formData.get("decision") || "").trim();
  const status = decision ? "decided" : "open";
  if (!["policy", "budget", "vote"].includes(kind)) return;
  if (id) {
    await admin.from("committee_items").update({ title, body, kind, decision: decision || null, status }).eq("id", id);
  } else if (title) {
    await admin.from("committee_items").insert({ title, body, kind, decision: decision || null, status });
  }
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Updated a committee item", subject: title });
  revalidatePath("/committee");
}

export async function savePermission(formData: FormData) {
  const { user, profile, admin, name } = await session();
  if (!canManageAdmin(profile.role, user)) throw new Error("Only an admin can change permissions.");
  const role = String(formData.get("role") || "");
  const feature = String(formData.get("feature") || "");
  const access = String(formData.get("access") || "none");
  if (!["none", "view", "manage"].includes(access)) return;
  await admin.from("role_permissions").upsert({ role, feature_key: feature, access });
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: "Changed a permission",
    subject: `${role} · ${feature}`,
    detail: access,
  });
  revalidatePath("/account/permissions");
  revalidatePath("/", "layout");
}

export async function setOnDuty(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "maintenance");
  if (!canRunFacility(profile.role, user)) throw new Error("Only the facility desk can set who is on duty.");
  const personId = String(formData.get("personId") || "");
  const onDuty = String(formData.get("onDuty") || "") === "true";
  if (!personId) return;
  await admin.from("profiles").update({ on_duty: onDuty }).eq("user_id", personId);
  await writeAudit({
    actorUserId: user.id,
    actorName: name,
    action: onDuty ? "Marked someone on duty" : "Marked someone off duty",
    subject: personId,
  });
  revalidatePath("/account/jobs");
  revalidatePath("/work");
}

export async function saveHomeDocument(formData: FormData) {
  const { user, profile, admin, name } = await session();
  await requireDeskManage(profile.role, user, "documents");
  const title = String(formData.get("title") || "").trim();
  const kind = String(formData.get("kind") || "other");
  const note = String(formData.get("note") || "").trim();
  const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
  if (!title || !["possession", "verification", "other"].includes(kind)) {
    throw new Error("Name the record.");
  }
  let flatId = profile.flatId;
  if (canManageAdmin(profile.role, user) && flatNumber) {
    const { data: flat } = await admin.from("flats").select("id").eq("flat_number", flatNumber).maybeSingle();
    if (!flat) throw new Error("That home is not in the brochure.");
    flatId = flat.id;
  }
  if (!flatId) throw new Error("Choose a home.");
  if (!canManageAdmin(profile.role, user) && profile.role !== "owner" && profile.role !== "co_owner") {
    throw new Error("Only the owner can add a record for this home.");
  }
  await admin.from("home_documents").insert({ flat_id: flatId, title, kind, note });
  await writeAudit({ actorUserId: user.id, actorName: name, action: "Added a home record", subject: title });
  revalidatePath("/documents");
  revalidatePath("/account/documents");
}
