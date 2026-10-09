import { postKind } from "@/lib/postKinds";
import { visibleText } from "@/lib/richText";
import { isMember, desk, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const NOTICE_KINDS = ["announcement", "builder_update", "maintenance", "meeting"];

function noticeLabel(kind: string) {
  if (kind === "meeting") return "Meeting";
  if (kind === "maintenance") return "Maintenance";
  return "Notice";
}

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

  const [feedAccess, noticeAccess] = await Promise.all([
    desk(member, "feed"),
    desk(member, "announcements"),
  ]);
  if (feedAccess === "none" && noticeAccess === "none") {
    return mobileJson({ message: "Updates are turned off." }, 403);
  }

  const admin = createAdminClient();
  const [{ data: posts }, { data: pinned }, { data: recent }] = await Promise.all([
    feedAccess === "none"
      ? Promise.resolve({ data: [] })
      : admin
          .from("member_posts")
          .select("id, author_name, flat_number, kind, body, created_at")
          .order("created_at", { ascending: false })
          .limit(40),
    noticeAccess === "none"
      ? Promise.resolve({ data: [] })
      : admin
          .from("activity_events")
          .select("id, title, body, created_at, kind")
          .eq("pinned", true)
          .in("kind", NOTICE_KINDS)
          .order("created_at", { ascending: false }),
    noticeAccess === "none"
      ? Promise.resolve({ data: [] })
      : admin
          .from("activity_events")
          .select("id, title, body, created_at, kind")
          .eq("pinned", false)
          .in("kind", NOTICE_KINDS)
          .order("created_at", { ascending: false })
          .limit(20),
  ]);

  const notices = [...(pinned ?? []), ...(recent ?? [])].map((notice) => ({
    id: notice.id,
    label: noticeLabel(String(notice.kind)),
    title: notice.title,
    body: visibleText(String(notice.body || "")),
    date: when(String(notice.created_at)),
  }));

  const updates = (posts ?? [])
    .filter((post) => post.kind !== "request" && post.kind !== "feedback")
    .map((post) => ({
      id: post.id,
      label: postKind(String(post.kind))?.label || "Update",
      who: post.flat_number ? `${post.author_name} · ${post.flat_number}` : post.author_name,
      body: visibleText(String(post.body || "")),
      date: when(String(post.created_at)),
    }));

  return mobileJson({ notices, updates });
}
