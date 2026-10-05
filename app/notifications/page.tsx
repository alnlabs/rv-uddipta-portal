import { redirect } from "next/navigation";
import { InboxList } from "@/components/InboxList";
import { SeeNotifications } from "@/components/SeeNotifications";
import { isMessageKind } from "@/lib/inbox";
import { getAuthState } from "@/lib/session";

export default async function NotificationsPage() {
  const { user, supabase } = await getAuthState();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notices = (rows ?? []).filter((row) => !isMessageKind(row.kind));
  const unread = notices.filter((row) => !row.read_at).length;

  return (
    <section className="page-gutter max-w-5xl py-6 md:py-10">
      <SeeNotifications />
      <h1 className="font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
        Notifications
      </h1>
      <p className="mt-2 text-base text-[#3d5247]">
        Announcements and notices for you.
      </p>
      <p className="mt-2 text-sm text-[#3d5247]">
        {unread ? `${unread} unread` : "You are up to date"}
      </p>
      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}
      <InboxList rows={notices} empty="No notifications yet." />
    </section>
  );
}
