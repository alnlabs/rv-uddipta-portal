import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { hostApprovalRequired, hostForFlat } from "@/lib/gateHost";
import { pushHome } from "@/lib/push";
import { canRunGate } from "@/lib/roles";
import { indiaDay } from "@/lib/indiaDay";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

function label(status: string) {
  if (status === "pending_approval") return "Waiting for the home";
  if (status === "expected") return "Expected";
  if (status === "waiting") return "Waiting";
  if (status === "inside") return "Inside";
  if (status === "left") return "Left";
  if (status === "refused") return "Refused";
  return status;
}

function shape(row: {
  id: number
  code: string
  visitor_name: string
  flat_number: string
  purpose: string | null
  status: string
  visit_on: string
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.visitor_name,
    home: row.flat_number,
    purpose: row.purpose || "Visitor",
    status: label(row.status),
    state: row.status,
    date: row.visit_on,
  };
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canRunGate(member.profile.role, member.user)) return mobileJson({ message: "The gate is for security." }, 403);
  const access = await desk(member, "gate");
  if (access === "none") return mobileJson({ message: "The gate is turned off." }, 403);

  const admin = createAdminClient();
  const today = indiaDay();
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() || "";
  const fields = "id, visitor_name, flat_number, purpose, status, visit_on, code";
  const [active, recentLeft] = await Promise.all([
    admin
      .from("visitor_passes")
      .select(fields)
      .in("status", ["waiting", "inside", "expected", "pending_approval"])
      .order("created_at", { ascending: false }),
    admin.from("visitor_passes").select(fields).eq("status", "left").order("created_at", { ascending: false }).limit(12),
  ]);
  if (active.error) return mobileJson({ message: active.error.message }, 500);
  if (recentLeft.error) return mobileJson({ message: recentLeft.error.message }, 500);
  const rows = active.data ?? [];
  const leftRows = recentLeft.data ?? [];
  let lookedUp = code ? rows.find((row) => row.code === code) ?? leftRows.find((row) => row.code === code) ?? null : null;
  if (code && !lookedUp) {
    const found = await admin.from("visitor_passes").select(fields).eq("code", code).maybeSingle();
    lookedUp = found.data;
  }

  return mobileJson({
    canManage: access === "manage",
    waiting: rows.filter((row) => row.status === "waiting").length,
    inside: rows.filter((row) => row.status === "inside").length,
    left: leftRows.length,
    lookup: lookedUp ? shape(lookedUp) : null,
    missing: Boolean(code) && !lookedUp,
    groups: [
      { title: "Waiting now", passes: rows.filter((row) => row.status === "waiting").map(shape) },
      { title: "Inside", passes: rows.filter((row) => row.status === "inside").map(shape) },
      { title: "Expected today", passes: rows.filter((row) => row.status === "expected" && row.visit_on === today).map(shape) },
      { title: "Left", passes: leftRows.map(shape) },
    ],
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canRunGate(member.profile.role, member.user)) return mobileJson({ message: "The gate is for security." }, 403);
  const access = await desk(member, "gate");
  if (access !== "manage") return mobileJson({ message: "You can see the gate. You cannot change it." }, 403);

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const admin = createAdminClient();

  if (action === "walkin") {
    const visitorName = String(body?.visitorName || "").trim();
    const flatNumber = String(body?.flatNumber || "").trim().toUpperCase();
    const purpose = String(body?.purpose || "").trim();
    if (visitorName.length < 2 || !flatNumber) return mobileJson({ message: "Enter a name and a home." }, 400);
    const { data: flat } = await admin.from("flats").select("id, flat_number").eq("flat_number", flatNumber).maybeSingle();
    if (!flat) return mobileJson({ message: "That home is not in the brochure." }, 400);
    const approval = await hostApprovalRequired(admin);
    const hostUserId = await hostForFlat(admin, flat.id);
    if (approval && !hostUserId) return mobileJson({ message: "Nobody at that home can approve a visitor yet." }, 400);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const { data: created, error } = await admin.from("visitor_passes").insert({
      code,
      flat_id: flat.id,
      flat_number: flat.flat_number,
      host_user_id: hostUserId,
      visitor_name: visitorName,
      purpose: purpose || "Walk-in",
      visit_on: indiaDay(),
      status: "waiting",
    }).select("id").single();
    if (error) return mobileJson({ message: error.message }, 500);
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Logged a walk-in",
      subject: visitorName,
      detail: flat.flat_number,
    });
    await pushHome({
      flatId: flat.id,
      hostUserId,
      title: "Visitor at the gate",
      body: `${visitorName} is waiting for ${flat.flat_number}.`,
      href: `/pass/${created.id}`,
    });
    revalidatePath("/gate");
    return mobileJson({ code });
  }

  const id = Number(body?.passId);
  const next = String(body?.status || "");
  if (!id || !["waiting", "inside", "left"].includes(next)) {
    return mobileJson({ message: "Choose a gate update." }, 400);
  }
  const { data: pass } = await admin.from("visitor_passes").select("*").eq("id", id).maybeSingle();
  if (!pass) return mobileJson({ message: "That pass is gone." }, 404);
  let bayId = pass.bay_id;
  if (next === "inside" && !bayId) {
    const { data: bays } = await admin.from("parking_bays").select("id").eq("kind", "visitor");
    const { data: used } = await admin.from("visitor_passes").select("bay_id").eq("status", "inside").not("bay_id", "is", null);
    const taken = new Set((used ?? []).map((row) => row.bay_id));
    bayId = (bays ?? []).find((bay) => !taken.has(bay.id))?.id ?? null;
  }
  if (next === "left") bayId = null;
  const { error } = await admin.from("visitor_passes").update({ status: next, bay_id: bayId }).eq("id", id);
  if (error) return mobileJson({ message: error.message }, 500);
  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
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
  return mobileJson({ status: label(next) });
}
