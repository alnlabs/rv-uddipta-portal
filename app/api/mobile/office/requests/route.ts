import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { desk, holdsSocietyAdmin, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { pushUsers } from "@/lib/push";
import { loadNoteThreads } from "@/lib/requestThread";
import { canRunJobs } from "@/lib/areaOwners";
import { relativeTime } from "@/lib/indiaDay";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting",
  done: "Done",
};

function normalizeStatus(value: string | null | undefined) {
  const status = String(value || "new");
  if (status === "open") return "new";
  if (status === "read") return "waiting";
  if (["new", "in_progress", "waiting", "done"].includes(status)) return status;
  return "new";
}

function when(value: string) {
  return relativeTime(value);
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!(await holdsSocietyAdmin(member))) {
    return mobileJson({ message: "Requests are for an admin." }, 403);
  }
  const access = await desk(member, "requests");
  if (access === "none") return mobileJson({ message: "Requests are turned off." }, 403);

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "feedback" ? "feedback" : "request";
  const admin = createAdminClient();
  const [{ data: notes, error }, { data: staff }] = await Promise.all([
    admin
      .from("member_notes")
      .select("id, author_name, flat_number, body, admin_reply, status, kind, created_at, image_url")
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(60),
    admin.from("profiles").select("user_id, display_name, role").in("role", ["staff", "facility"]),
  ]);
  if (error) return mobileJson({ message: error.message }, 500);

  const noteIds = (notes ?? []).map((note) => note.id as number);
  const threads = await loadNoteThreads(noteIds);
  const { data: jobs } = noteIds.length
    ? await admin
        .from("work_orders")
        .select("id, source_note_id, assignee_user_id, status")
        .in("source_note_id", noteIds)
    : { data: [] as { id: number; source_note_id: number | null; assignee_user_id: string | null; status: string }[] };

  const jobFor = new Map<number, { id: number; assignee: string | null; status: string }>();
  for (const job of jobs ?? []) {
    if (job.source_note_id) {
      jobFor.set(job.source_note_id, {
        id: job.id,
        assignee: job.assignee_user_id,
        status: job.status,
      });
    }
  }
  const staffName = new Map((staff ?? []).map((person) => [person.user_id, person.display_name || person.role]));

  return mobileJson({
    canManage: access === "manage",
    canOpenJob: await canRunJobs(member.profile.role, member.user),
    kind,
    people: (staff ?? []).map((person) => ({
      id: person.user_id as string,
      name: person.display_name || person.role,
    })),
    requests: (notes ?? []).map((note) => {
      const linked = jobFor.get(note.id as number);
      const assigneeName = linked?.assignee ? staffName.get(linked.assignee) || "Staff" : null;
      const lines = threads.get(note.id as number) ?? [];
      const status = normalizeStatus(note.status);
      return {
        id: note.id as number,
        kind: note.kind === "feedback" ? "Feedback" : "Request",
        who: String(note.author_name || "Resident"),
        home: String(note.flat_number || ""),
        body: String(note.body || ""),
        status,
        statusLabel: STATUS_LABEL[status] || status,
        date: when(String(note.created_at)),
        imageUrl: note.image_url ? String(note.image_url) : "",
        assigneeId: linked?.assignee || null,
        assigneeName,
        jobId: linked?.id ?? null,
        messages: lines.length
          ? lines.map((line) => ({
              id: line.id,
              who: line.fromOffice ? "Office" : line.authorName,
              body: line.body,
              fromOffice: line.fromOffice,
            }))
          : [
              ...(note.body
                ? [{ id: 0, who: String(note.author_name || "Resident"), body: String(note.body), fromOffice: false }]
                : []),
              ...(note.admin_reply
                ? [{ id: -1, who: "Office", body: String(note.admin_reply), fromOffice: true }]
                : []),
            ],
      };
    }),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!(await holdsSocietyAdmin(member))) {
    return mobileJson({ message: "Requests are for an admin." }, 403);
  }
  const access = await desk(member, "requests");
  if (access !== "manage") return mobileJson({ message: "You can see requests. You cannot change them." }, 403);

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const noteId = Number(body?.noteId || 0);
  if (!noteId) return mobileJson({ message: "Choose a request." }, 400);

  const admin = createAdminClient();

  if (action === "reply") {
    const reply = String(body?.reply || "").trim();
    if (reply.length < 1) return mobileJson({ message: "Write a reply first." }, 400);
    const { data: note } = await admin
      .from("member_notes")
      .select("author_user_id, kind, flat_number")
      .eq("id", noteId)
      .maybeSingle();
    if (!note) return mobileJson({ message: "That note is gone." }, 404);
    const { error } = await admin
      .from("member_notes")
      .update({ admin_reply: reply, status: "waiting" })
      .eq("id", noteId);
    if (error) return mobileJson({ message: error.message }, 500);
    await admin.from("note_messages").insert({
      note_id: noteId,
      author_user_id: member.user.id,
      author_name: member.name,
      from_office: true,
      body: reply,
    });
    if (note.author_user_id) {
      const title = note.kind === "request" ? "Reply to your request" : "Reply to your feedback";
      await admin.from("notifications").insert({
        user_id: note.author_user_id,
        kind: "note_reply",
        title,
        body: reply,
        href: "/requests",
      });
      await pushUsers([note.author_user_id], title, reply);
    }
    revalidatePath("/account/requests");
    revalidatePath("/requests");
    revalidatePath("/notifications");
    return mobileJson({ message: "Reply sent." });
  }

  if (action === "status") {
    const status = String(body?.status || "");
    if (!["new", "in_progress", "waiting", "done"].includes(status)) {
      return mobileJson({ message: "Choose a status." }, 400);
    }
    const { error } = await admin.from("member_notes").update({ status }).eq("id", noteId);
    if (error) return mobileJson({ message: error.message }, 500);
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Updated a request",
      subject: String(noteId),
      detail: status,
    });
    revalidatePath("/account/requests");
    revalidatePath("/requests");
    return mobileJson({ message: "Status updated." });
  }

  if (action === "assign") {
    const assignee = String(body?.assignee || "");
    if (!assignee) return mobileJson({ message: "Choose the person doing the work." }, 400);
    const { data: person } = await admin
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", assignee)
      .maybeSingle();
    if (!person || (person.role !== "staff" && person.role !== "facility")) {
      return mobileJson({ message: "Choose someone from facility or service staff." }, 400);
    }
    const { data: note } = await admin
      .from("member_notes")
      .select("id, body, flat_number")
      .eq("id", noteId)
      .maybeSingle();
    if (!note) return mobileJson({ message: "That note is gone." }, 404);
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
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Assigned a request",
      subject: String(noteId),
      detail: assignee,
    });
    revalidatePath("/account/requests");
    revalidatePath("/account/jobs");
    revalidatePath("/work");
    return mobileJson({ message: "Assigned." });
  }

  if (action === "job") {
    if (!(await canRunJobs(member.profile.role, member.user))) {
      return mobileJson({ message: "Only the repairs desk can open a job." }, 403);
    }
    const maintenance = await desk(member, "maintenance");
    if (maintenance !== "manage") return mobileJson({ message: "Jobs are turned off." }, 403);
    const { data: note } = await admin
      .from("member_notes")
      .select("id, body, flat_number")
      .eq("id", noteId)
      .maybeSingle();
    if (!note) return mobileJson({ message: "That note is gone." }, 404);
    const title = String(body?.title || note.body || "").trim().slice(0, 80);
    const place = String(body?.place || note.flat_number || "").trim();
    const detail = String(body?.body || note.body || "").trim();
    if (title.length < 2) return mobileJson({ message: "Name the job." }, 400);
    const { data: existing } = await admin
      .from("work_orders")
      .select("id")
      .eq("source_note_id", noteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      await admin.from("work_orders").update({ title, place, body: detail }).eq("id", existing.id);
      await admin.from("member_notes").update({ status: "in_progress" }).eq("id", noteId);
      await writeAudit({
        actorUserId: member.user.id,
        actorName: member.name,
        action: "Updated a job",
        subject: title,
        detail: place,
      });
      revalidatePath("/account/jobs");
      revalidatePath("/work");
      revalidatePath("/account/requests");
      return mobileJson({ message: "Job details updated." });
    }
    await admin.from("work_orders").insert({
      title,
      place,
      body: detail,
      source_note_id: noteId,
      status: "open",
    });
    await admin.from("member_notes").update({ status: "in_progress" }).eq("id", noteId);
    await writeAudit({
      actorUserId: member.user.id,
      actorName: member.name,
      action: "Opened a job",
      subject: title,
      detail: place,
    });
    revalidatePath("/account/jobs");
    revalidatePath("/work");
    revalidatePath("/account/requests");
    return mobileJson({ message: "Job opened." });
  }

  return mobileJson({ message: "Choose a request action." }, 400);
}
