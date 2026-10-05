import { redirect } from "next/navigation";
import { markNoteRead, replyToNote } from "@/app/actions/updates";
import { Form, TextAreaField, WorkspaceHeader } from "@/components/form-ui";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const params = await searchParams;
  const kind = params.kind === "feedback" ? "feedback" : "request";
  const admin = createAdminClient();
  const { data: notes, error } = await admin
    .from("member_notes")
    .select("id, author_name, flat_number, body, admin_reply, status, kind, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <section>
      <WorkspaceHeader
        title="Requests"
        lede="Help requests and feedback from members."
      />

      <div className="mt-4 flex gap-2">
        <a
          href="/account/requests"
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
            kind === "request" ? "bg-[#1b3a2f] text-[#e8d5a3]" : "text-[#14241c] ring-1 ring-[rgba(27,58,47,0.16)]"
          }`}
        >
          Requests
        </a>
        <a
          href="/account/requests?kind=feedback"
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
            kind === "feedback" ? "bg-[#1b3a2f] text-[#e8d5a3]" : "text-[#14241c] ring-1 ring-[rgba(27,58,47,0.16)]"
          }`}
        >
          Feedback
        </a>
      </div>

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        {(notes ?? []).length === 0 ? (
          <li className="rounded-2xl bg-[#fffcf5] p-4 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
            Nothing here.
          </li>
        ) : (
          (notes ?? []).map((note) => (
            <li
              key={note.id}
              className="rounded-[1.35rem] border-l-4 border-[#c9a45c] bg-[#fffcf5] p-4 shadow-[inset_0_0_0_1px_rgba(27,58,47,0.08)]"
            >
              <p className="text-sm font-semibold text-[#7a5c22]">
                {note.author_name}
                {note.flat_number ? ` · ${note.flat_number}` : ""}
                {note.status !== "open" ? ` · ${note.status === "done" ? "Done" : "Read"}` : ""}
              </p>
              <p className="mt-2 text-base text-[#14241c]">{note.body}</p>
              {note.admin_reply ? (
                <p className="mt-2 text-sm text-[#3d5247]">Reply: {note.admin_reply}</p>
              ) : null}
              {kind === "request" ? (
                <Form action={replyToNote} success="Reply sent." className="mt-3 grid gap-2">
                  <input type="hidden" name="noteId" value={note.id} />
                  <TextAreaField
                    label="Reply"
                    name="reply"
                    required
                    rows={2}
                    defaultValue={note.admin_reply || ""}
                    hint="Sending a reply marks this done."
                  />
                  <button type="submit" className="btn btn-gold w-full sm:w-fit">
                    Reply
                  </button>
                </Form>
              ) : note.status === "open" ? (
                <form action={markNoteRead} className="mt-3">
                  <input type="hidden" name="noteId" value={note.id} />
                  <button type="submit" className="btn btn-forest w-full sm:w-fit">
                    Mark read
                  </button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
