import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { isMember, desk, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canManageAdmin } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "visitor_passes");
  if (access !== "manage") return mobileJson({ message: "You can see passes. You cannot approve one." }, 403);

  const body = await request.json().catch(() => null);
  const id = Number(body?.passId);
  const next = String(body?.status || "");
  if (!id || (next !== "expected" && next !== "refused")) {
    return mobileJson({ message: "Choose allow or refuse." }, 400);
  }

  const admin = createAdminClient();
  const { data: pass } = await admin.from("visitor_passes").select("*").eq("id", id).maybeSingle();
  if (!pass) return mobileJson({ message: "That pass is gone." }, 404);
  const host = pass.host_user_id === member.user.id;
  if (!host && !canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Only the host can approve this pass." }, 403);
  }
  if (pass.status !== "pending_approval") {
    return mobileJson({ message: "This pass is no longer waiting for you." }, 400);
  }
  if (member.profile.flatId && pass.flat_id && pass.flat_id !== member.profile.flatId && !canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Only the host can approve this pass." }, 403);
  }

  const { error } = await admin.from("visitor_passes").update({ status: next }).eq("id", id);
  if (error) return mobileJson({ message: error.message }, 500);
  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Updated a visitor pass",
    subject: pass.visitor_name,
    detail: pass.flat_number,
  });
  revalidatePath("/visitors");
  revalidatePath("/gate");
  revalidatePath(`/pass/${pass.code}`);
  return mobileJson({ status: next === "expected" ? "Expected" : "Refused" });
}
