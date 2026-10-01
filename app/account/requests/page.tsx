import { redirect } from "next/navigation";
import { markNoteRead, replyToNote } from "@/app/actions/updates";
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
    <section className="mx-auto max-w-3xl">
      <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight text-[#14241c]">
        Requests
      </h1>
      <p className="mt-2 text-base text-[#3d5247]">
        Help requests and feedback from members.
      </p>

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

      <ul className="mt-6 flex flex-col gap-3">
        {(notes ?? []).length === 0 ? (
          <li className="rounded-2xl bg-[#fffcf5] p-4 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
            Nothing here.
          </li>
        ) : (
          (notes ?? []).map((note) => (
            <li
              key={note.id}
              className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.1)]"
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
                <form action={replyToNote} className="mt-3 grid gap-2">
                  <input type="hidden" name="noteId" value={note.id} />
                  <label className="text-sm font-semibold">
                    Reply
                    <textarea
                      name="reply"
                      required
                      rows={2}
                      defaultValue={note.admin_reply || ""}
                      className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.14)] px-3 py-2 font-normal"
                    />
                  </label>
                  <button
                    type="submit"
                    className="min-h-11 w-fit rounded-full bg-[#c9a45c] px-4 text-sm font-semibold text-[#14241c]"
                  >
                    Reply
                  </button>
                  <p className="text-sm text-[#3d5247]">Sending a reply marks this done.</p>
                </form>
              ) : note.status === "open" ? (
                <form action={markNoteRead} className="mt-3">
                  <input type="hidden" name="noteId" value={note.id} />
                  <button
                    type="submit"
                    className="min-h-11 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
                  >
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
