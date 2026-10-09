import { revalidatePath } from "next/cache";
import { disabledRequestKinds } from "@/lib/features";
import { isMember, desk, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { loadNoteThreads } from "@/lib/requestThread";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting on you",
  done: "Done",
  open: "New",
  read: "Waiting on you",
};

function when(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "requests");
  if (access === "none") return mobileJson({ message: "Requests are turned off." }, 403);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("member_notes")
    .select("id, kind, body, status, created_at")
    .eq("author_user_id", member.user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return mobileJson({ message: error.message }, 500);

  const notes = data ?? [];
  const noteIds = notes.map((note) => note.id as number);
  const threads = await loadNoteThreads(noteIds);
  const { data: jobs } = noteIds.length
    ? await admin
        .from("work_orders")
        .select("source_note_id, assignee_user_id, status")
        .in("source_note_id", noteIds)
    : { data: [] as { source_note_id: number | null; assignee_user_id: string | null; status: string }[] };
  const assigneeIds = [...new Set((jobs ?? []).map((job) => job.assignee_user_id).filter(Boolean))] as string[];
  const { data: workers } = assigneeIds.length
    ? await admin.from("profiles").select("user_id, display_name").in("user_id", assigneeIds)
    : { data: [] as { user_id: string; display_name: string | null }[] };
  const workerName = new Map((workers ?? []).map((person) => [person.user_id, person.display_name || "Staff"]));
  const workerFor = new Map<number, string>();
  for (const job of jobs ?? []) {
    if (job.source_note_id && job.assignee_user_id && job.status !== "done") {
      workerFor.set(job.source_note_id, workerName.get(job.assignee_user_id) || "Staff");
    }
  }

  const closed = await disabledRequestKinds();
  return mobileJson({
    canSend: access === "manage" && !closed.includes("request"),
    requests: notes.map((note) => {
      const worker = workerFor.get(note.id as number);
      const status = STATUS_LABEL[note.status] || note.status;
      return {
        id: note.id,
        kind: note.kind === "feedback" ? "Feedback" : "Request",
        body: note.body,
        status: worker ? `${status} · With ${worker}` : status,
        date: when(String(note.created_at)),
        canReply: access === "manage" && note.status !== "done",
        messages: (threads.get(note.id as number) ?? []).map((line) => ({
          id: line.id,
          who: line.fromOffice ? "Office" : line.authorName,
          body: line.body,
        })),
      };
    }),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "requests");
  if (access !== "manage") return mobileJson({ message: "You can see requests. You cannot send one." }, 403);

  const body = await request.json().catch(() => null);
  const noteId = Number(body?.noteId);
  if (noteId) return answerRequest(member, noteId, String(body?.body || ""));

  const kind = String(body?.kind || "request");
  const message = String(body?.body || "").trim();
  if (kind !== "request" && kind !== "feedback") {
    return mobileJson({ message: "Choose a request or feedback." }, 400);
  }
  if ((await disabledRequestKinds()).includes(kind)) {
    return mobileJson({ message: "That is closed right now." }, 403);
  }
  if (message.length < 2) return mobileJson({ message: "Write a few words first." }, 400);

  const admin = createAdminClient();
  const { data: note, error } = await admin
    .from("member_notes")
    .insert({
      author_user_id: member.user.id,
      flat_id: member.profile.flatId,
      flat_number: member.flatNumber,
      author_name: member.name,
      kind,
      body: message,
    })
    .select("id")
    .single();
  if (error || !note) return mobileJson({ message: "Could not send that. Try again." }, 500);

  await admin.from("note_messages").insert({
    note_id: note.id,
    author_user_id: member.user.id,
    author_name: member.name,
    from_office: false,
    body: message,
  });

  const { data: admins } = await admin.from("profiles").select("user_id").eq("role", "admin");
  const title = kind === "request" ? "New request" : "New feedback";
  const rows = (admins ?? [])
    .filter((row) => row.user_id !== member.user.id)
    .map((row) => ({
      user_id: row.user_id as string,
      kind,
      title: member.flatNumber ? `${title} · ${member.flatNumber}` : title,
      body: message,
      href: "/account/requests",
    }));
  if (rows.length) await admin.from("notifications").insert(rows);

  revalidatePath("/account/requests");
  revalidatePath("/notifications");
  revalidatePath("/requests");
  return mobileJson({
    message: kind === "request" ? "Request sent to the admin." : "Feedback sent to the admin.",
  });
}

async function answerRequest(
  member: { user: { id: string }; name: string },
  noteId: number,
  text: string,
) {
  const body = text.trim();
  if (body.length < 2) return mobileJson({ message: "Write a few words first." }, 400);
  const admin = createAdminClient();
  const { data: note } = await admin
    .from("member_notes")
    .select("id, author_user_id, status, flat_number, kind")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || note.author_user_id !== member.user.id) {
    return mobileJson({ message: "That is not your message." }, 403);
  }
  if (note.status === "done") {
    return mobileJson({ message: "The office has finished this. Start a new one." }, 400);
  }
  const { error } = await admin.from("note_messages").insert({
    note_id: noteId,
    author_user_id: member.user.id,
    author_name: member.name,
    from_office: false,
    body,
  });
  if (error) return mobileJson({ message: error.message }, 500);
  await admin.from("member_notes").update({ status: "in_progress" }).eq("id", noteId);
  const { data: admins } = await admin.from("profiles").select("user_id").eq("role", "admin");
  const title = note.kind === "feedback" ? "Reply on feedback" : "Reply on a request";
  const rows = (admins ?? [])
    .filter((row) => row.user_id !== member.user.id)
    .map((row) => ({
      user_id: row.user_id as string,
      kind: "note_reply",
      title: note.flat_number ? `${title} · ${note.flat_number}` : title,
      body,
      href: "/account/requests",
    }));
  if (rows.length) await admin.from("notifications").insert(rows);
  revalidatePath("/requests");
  revalidatePath("/account/requests");
  revalidatePath("/notifications");
  return mobileJson({ message: "Sent." });
}
