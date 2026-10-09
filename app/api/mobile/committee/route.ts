import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canSitCommittee } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canSitCommittee(member.profile.role, member.user)) return mobileJson({ message: "Decisions are for the committee." }, 403);
  const access = await desk(member, "committee");
  if (access === "none") return mobileJson({ message: "Committee is turned off." }, 403);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("committee_items")
    .select("id, title, body, kind, status, decision")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return mobileJson({ message: error.message }, 500);
  return mobileJson({
    canManage: access === "manage",
    items: (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body || "",
      kind: item.kind,
      status: item.status,
      decision: item.decision || "",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canSitCommittee(member.profile.role, member.user)) return mobileJson({ message: "Decisions are for the committee." }, 403);
  const access = await desk(member, "committee");
  if (access !== "manage") return mobileJson({ message: "You can see decisions. You cannot record one." }, 403);

  const body = await request.json().catch(() => null);
  const id = Number(body?.itemId || 0);
  const title = String(body?.title || "").trim();
  const note = String(body?.body || "").trim();
  const kind = String(body?.kind || "policy");
  const decision = String(body?.decision || "").trim();
  if (!["policy", "budget", "vote"].includes(kind)) return mobileJson({ message: "Choose a type." }, 400);
  if (!id && title.length < 2) return mobileJson({ message: "Name the decision." }, 400);

  const admin = createAdminClient();
  const status = decision ? "decided" : "open";
  if (id) {
    const { error } = await admin.from("committee_items").update({
      title,
      body: note,
      kind,
      decision: decision || null,
      status,
    }).eq("id", id);
    if (error) return mobileJson({ message: error.message }, 500);
  } else {
    const { error } = await admin.from("committee_items").insert({
      title,
      body: note,
      kind,
      decision: decision || null,
      status,
    });
    if (error) return mobileJson({ message: error.message }, 500);
  }
  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Updated a committee item",
    subject: title,
  });
  revalidatePath("/committee");
  return mobileJson({ ok: true });
}
