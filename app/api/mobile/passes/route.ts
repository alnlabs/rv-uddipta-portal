import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isMember, desk, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { isCommunityRole } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Waiting for you",
  expected: "Expected",
  waiting: "Waiting at the gate",
  inside: "Inside",
  left: "Left",
  refused: "Refused",
};

function passCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 8; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "visitor_passes");
  if (access === "none") return mobileJson({ message: "Visitor passes are turned off." }, 403);

  const admin = createAdminClient();
  const query = admin
    .from("visitor_passes")
    .select("id, code, visitor_name, purpose, visit_on, status, flat_number, host_user_id")
    .order("created_at", { ascending: false })
    .limit(30);
  const { data, error } = member.profile.flatId
    ? await query.eq("flat_id", member.profile.flatId)
    : await query.eq("host_user_id", member.user.id);
  if (error) return mobileJson({ message: error.message }, 500);

  return mobileJson({
    canCreate: access === "manage" && Boolean(member.profile.flatId),
    passes: (data ?? []).map((pass) => ({
      id: pass.id,
      code: pass.code,
      name: pass.visitor_name,
      purpose: pass.purpose || "",
      date: pass.visit_on,
      home: pass.flat_number,
      status: STATUS_LABEL[pass.status] || pass.status,
      canDecide: pass.status === "pending_approval" && pass.host_user_id === member.user.id && access === "manage",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "visitor_passes");
  if (access !== "manage") return mobileJson({ message: "You can see passes. You cannot create one." }, 403);
  if (!isCommunityRole(member.profile.role) || !member.profile.flatId || !member.flatNumber) {
    return mobileJson({ message: "Link a home before creating a pass." }, 403);
  }

  const body = await request.json().catch(() => null);
  const visitorName = String(body?.visitorName || "").trim();
  const purpose = String(body?.purpose || "").trim();
  const phone = String(body?.phone || "").trim();
  const visitOn = String(body?.visitOn || "").trim();
  if (visitorName.length < 2) return mobileJson({ message: "Enter the visitor's name." }, 400);

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("project_info")
    .select("host_approval")
    .eq("id", 1)
    .maybeSingle();
  const status = settings?.host_approval ? "pending_approval" : "expected";
  const code = passCode();
  const { error } = await admin.from("visitor_passes").insert({
    code,
    flat_id: member.profile.flatId,
    flat_number: member.flatNumber,
    host_user_id: member.user.id,
    visitor_name: visitorName,
    visitor_phone: phone || null,
    purpose,
    visit_on: /^\d{4}-\d{2}-\d{2}$/.test(visitOn) ? visitOn : new Date().toISOString().slice(0, 10),
    status,
  });
  if (error) return mobileJson({ message: error.message }, 500);

  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Created a visitor pass",
    subject: visitorName,
    detail: member.flatNumber,
  });
  revalidatePath("/visitors");
  revalidatePath("/gate");
  return mobileJson({ code, status: STATUS_LABEL[status] || status });
}
