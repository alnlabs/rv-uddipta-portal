import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canDoStaffWork } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canDoStaffWork(member.profile.role, member.user)) return mobileJson({ message: "This desk is for service staff." }, 403);
  const access = await desk(member, "maintenance");
  if (access === "none") return mobileJson({ message: "Work is turned off." }, 403);

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("on_duty").eq("user_id", member.user.id).maybeSingle();
  let query = admin.from("work_orders").select("id, title, place, body, status").order("created_at", { ascending: false }).limit(40);
  if (member.profile.role === "staff") query = query.eq("assignee_user_id", member.user.id);
  const { data, error } = await query;
  if (error) return mobileJson({ message: error.message }, 500);
  const jobs = data ?? [];
  return mobileJson({
    onDuty: Boolean(me?.on_duty),
    canManage: access === "manage",
    open: jobs.filter((job) => job.status !== "done"),
    done: jobs.filter((job) => job.status === "done"),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canDoStaffWork(member.profile.role, member.user)) return mobileJson({ message: "This desk is for service staff." }, 403);
  const access = await desk(member, "maintenance");
  if (access !== "manage") return mobileJson({ message: "You can see the jobs. You cannot update them." }, 403);

  const body = await request.json().catch(() => null);
  const id = Number(body?.jobId);
  const status = String(body?.status || "");
  if (!id || !["in_progress", "done"].includes(status)) return mobileJson({ message: "Choose start or done." }, 400);
  const admin = createAdminClient();
  const { data: job } = await admin.from("work_orders").select("assignee_user_id, title").eq("id", id).maybeSingle();
  if (!job) return mobileJson({ message: "That job is gone." }, 404);
  if (member.profile.role === "staff" && job.assignee_user_id !== member.user.id) {
    return mobileJson({ message: "This job is not yours." }, 403);
  }
  const { error } = await admin.from("work_orders").update({ status }).eq("id", id);
  if (error) return mobileJson({ message: error.message }, 500);
  await writeAudit({
    actorUserId: member.user.id,
    actorName: member.name,
    action: "Updated a job",
    subject: job.title,
    detail: status,
  });
  revalidatePath("/work");
  revalidatePath("/account/jobs");
  return mobileJson({ ok: true });
}
