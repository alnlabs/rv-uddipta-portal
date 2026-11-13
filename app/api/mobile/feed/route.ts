import { revalidatePath } from "next/cache";
import { publishActivity } from "@/lib/activity";
import { postKind, NOTICE_KINDS as NOTICE_OPTIONS } from "@/lib/postKinds";
import { reachCommunity } from "@/lib/reach";
import { visibleText } from "@/lib/richText";
import { isMember, desk, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canManageAdmin } from "@/lib/roles";
import { relativeTime } from "@/lib/indiaDay";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const NOTICE_KINDS = ["announcement", "builder_update", "maintenance", "meeting"];

function noticeLabel(kind: string) {
  if (kind === "meeting") return "Meeting";
  if (kind === "maintenance") return "Maintenance";
  return "Notice";
}

function when(value: string) {
  return relativeTime(value);
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

  return mobileJson({
    notices,
    updates,
    canPublish: canManageAdmin(member.profile.role, member.user) && noticeAccess === "manage",
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Only an admin can publish a notice." }, 403);
  }
  const access = await desk(member, "announcements");
  if (access !== "manage") return mobileJson({ message: "Announcements are turned off." }, 403);

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const text = String(body?.body || "").trim();
  const kind = String(body?.kind || "announcement");
  const notice = NOTICE_OPTIONS.find((item) => item.value === kind);
  if (!notice) return mobileJson({ message: "Choose a type." }, 400);
  if (title.length < 3) return mobileJson({ message: "Write a title of at least 3 characters." }, 400);

  let startsOn: string | null = null;
  if (notice.value === "meeting") {
    startsOn = String(body?.startsOn || "").trim();
    if (!startsOn || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
      return mobileJson({ message: "Choose the meeting date." }, 400);
    }
  }

  const eventId = await publishActivity({
    actorUserId: member.user.id,
    kind: notice.value,
    title,
    body: text || null,
    payload: startsOn ? { startsOn } : {},
    visibility: "community",
    href: "/feed",
    notify: "community",
  });
  if (!eventId) return mobileJson({ message: "Could not publish that notice. Try again." }, 500);

  if (Boolean(body?.pin)) {
    const admin = createAdminClient();
    await admin.from("activity_events").update({ pinned: true }).eq("id", eventId);
  }

  await reachCommunity({
    title: `${notice.label} · ${title}`,
    body: visibleText(text) || title,
    exceptUserId: member.user.id,
  }).catch((error: unknown) => {
    console.warn("announcement reach failed", error instanceof Error ? error.message : error);
  });

  revalidatePath("/feed");
  revalidatePath("/notifications");
  return mobileJson({ ok: true, id: eventId, message: "Posted." });
}
