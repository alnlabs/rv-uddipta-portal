import { redirect } from "next/navigation";
import { FeatureOff } from "@/components/FeatureOff";
import { InboxList } from "@/components/InboxList";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { SeeNotifications } from "@/components/SeeNotifications";
import { isMessageKind } from "@/lib/inbox";
import { getAuthState } from "@/lib/session";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { user, profile, supabase } = await getAuthState();
  if (!user) redirect("/login?next=/inbox");
  if ((await resolveDeskAccess(profile.role, user, "inbox")) === "none") {
    return <FeatureOff label="Inbox" />;
  }
  const params = await searchParams;
  const view = params.view === "messages" ? "messages" : "notices";

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const notices = (rows ?? []).filter((row) => !isMessageKind(row.kind));
  const messages = (rows ?? []).filter((row) => isMessageKind(row.kind));
  const shown = view === "messages" ? messages : notices;

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      {view === "notices" ? <SeeNotifications /> : null}
      <p className="eyebrow">Communication</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a]">Inbox</h1>
      <p className="mt-2 text-[#475569]">Notices and messages stay in two lists.</p>
      <div className="mt-4 flex gap-2">
        <a href="/inbox" className={view === "notices" ? "btn-slate" : "btn-line"}>
          Notifications ({notices.length})
        </a>
        <a href="/inbox?view=messages" className={view === "messages" ? "btn-slate" : "btn-line"}>
          Messages ({messages.length})
        </a>
      </div>
      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}
      <div className="mt-5">
        <InboxList
          rows={shown}
          empty={view === "messages" ? "No messages yet." : "No notifications yet."}
        />
      </div>
    </section>
  );
}
