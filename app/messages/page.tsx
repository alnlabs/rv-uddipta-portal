import { redirect } from "next/navigation";
import { InboxList } from "@/components/InboxList";
import { isMessageKind } from "@/lib/inbox";
import { getAuthState } from "@/lib/session";

export default async function MessagesPage() {
  const { user, supabase } = await getAuthState();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const messages = (rows ?? []).filter((row) => isMessageKind(row.kind));
  const unread = messages.filter((row) => !row.read_at).length;

  return (
    <section className="page-gutter max-w-5xl py-6 md:py-10">
      <h1 className="font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
        Messages
      </h1>
      <p className="mt-2 text-base text-[#3d5247]">Replies sent to you.</p>
      <p className="mt-2 text-sm text-[#3d5247]">
        {unread ? `${unread} unread` : "You are up to date"}
      </p>
      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}
      <InboxList rows={messages} empty="No messages yet." />
    </section>
  );
}
