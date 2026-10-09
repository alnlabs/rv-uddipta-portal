import { redirect } from "next/navigation";
import { FeatureOff } from "@/components/FeatureOff";
import { UpdatesBoard, type FeedNotice, type FeedPost, type FeedSlice } from "@/components/UpdatesBoard";
import { isSuperAdmin } from "@/lib/admin";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { disabledCommunityKinds, loadCategoryLabels } from "@/lib/features";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const NOTICE_QUERY = ["announcement", "builder_update", "maintenance", "meeting"];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  const community = isCommunityRole(profile.role) || isSuperAdmin(user);
  if (!community) redirect("/register");
  const params = await searchParams;
  const requested =
    params.view === "notices" || params.view === "events" || params.view === "polls" ? params.view : "all";
  const [feedAccess, noticeAccess, eventAccess, pollAccess] = await Promise.all([
    resolveDeskAccess(profile.role, user, "feed"),
    resolveDeskAccess(profile.role, user, "announcements"),
    resolveDeskAccess(profile.role, user, "events"),
    resolveDeskAccess(profile.role, user, "polls"),
  ]);
  if (feedAccess === "none" && noticeAccess === "none" && eventAccess === "none" && pollAccess === "none") {
    return <FeatureOff label="Updates" />;
  }
  const initialSlice: FeedSlice =
    requested === "notices" && noticeAccess !== "none"
      ? "notices"
      : requested === "events" && eventAccess !== "none"
        ? "events"
        : requested === "polls" && pollAccess !== "none"
          ? "polls"
          : "all";

  const admin = createAdminClient();
  const [{ data: posts }, { data: replies }, { data: pinnedNotices }, { data: recentNotices }] =
    await Promise.all([
    admin
      .from("member_posts")
      .select("id, author_user_id, author_name, flat_number, kind, topic, body, created_at, image_url, starts_on, closed_at, sold_at, poll_multiple")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("member_replies")
      .select("id, post_id, author_user_id, author_name, flat_number, body")
      .order("created_at", { ascending: true }),
    admin
      .from("activity_events")
      .select("id, title, body, created_at, kind, pinned, payload")
      .eq("pinned", true)
      .in("kind", NOTICE_QUERY)
      .order("created_at", { ascending: false }),
    admin
      .from("activity_events")
      .select("id, title, body, created_at, kind, pinned, payload")
      .eq("pinned", false)
      .in("kind", NOTICE_QUERY)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const notices: FeedNotice[] =
    noticeAccess === "none" ? [] : [...(pinnedNotices ?? []), ...(recentNotices ?? [])];

  const repliesByPost = new Map<number, FeedPost["replies"]>();
  for (const reply of replies ?? []) {
    const list = repliesByPost.get(reply.post_id) ?? [];
    list.push(reply);
    repliesByPost.set(reply.post_id, list);
  }

  const postIds = (posts ?? []).map((post) => post.id);
  const eventIds = (posts ?? []).filter((post) => post.kind === "event").map((post) => post.id);
  const [{ data: reactionRows }, { data: rsvpRows }] = postIds.length
    ? await Promise.all([
        admin.from("member_post_reactions").select("post_id, user_id, kind").in("post_id", postIds),
        eventIds.length
          ? admin.from("member_event_rsvps").select("post_id, user_id").in("post_id", eventIds)
          : Promise.resolve({ data: [] as { post_id: number; user_id: string }[] }),
      ])
    : [{ data: [] }, { data: [] }];

  const reactionsByPost = new Map<number, NonNullable<FeedPost["reactions"]>>();
  for (const row of reactionRows ?? []) {
    const current = reactionsByPost.get(row.post_id) ?? { helpful: 0, thanks: 0, mine: null };
    if (row.kind === "helpful") current.helpful += 1;
    if (row.kind === "thanks") current.thanks += 1;
    if (row.user_id === user.id && (row.kind === "helpful" || row.kind === "thanks")) {
      current.mine = row.kind;
    }
    reactionsByPost.set(row.post_id, current);
  }
  const rsvpByPost = new Map<number, NonNullable<FeedPost["rsvp"]>>();
  for (const row of rsvpRows ?? []) {
    const current = rsvpByPost.get(row.post_id) ?? { count: 0, going: false };
    current.count += 1;
    if (row.user_id === user.id) current.going = true;
    rsvpByPost.set(row.post_id, current);
  }

  const pollIds = (posts ?? []).filter((post) => post.kind === "poll").map((post) => post.id);
  const [{ data: pollOptions }, { data: pollVotes }] = pollIds.length
    ? await Promise.all([
        admin
          .from("member_poll_options")
          .select("id, post_id, label, position")
          .in("post_id", pollIds)
          .order("position", { ascending: true }),
        admin
          .from("member_poll_votes")
          .select("post_id, option_id, user_id")
          .in("post_id", pollIds),
      ])
    : [{ data: [] }, { data: [] }];

  const votesByOption = new Map<number, number>();
  const myVotesByPost = new Map<number, number[]>();
  const votersByPost = new Map<number, Set<string>>();
  for (const vote of pollVotes ?? []) {
    votesByOption.set(vote.option_id, (votesByOption.get(vote.option_id) ?? 0) + 1);
    if (vote.user_id === user.id) {
      const mine = myVotesByPost.get(vote.post_id) ?? [];
      mine.push(vote.option_id);
      myVotesByPost.set(vote.post_id, mine);
    }
    const voters = votersByPost.get(vote.post_id) ?? new Set<string>();
    voters.add(vote.user_id);
    votersByPost.set(vote.post_id, voters);
  }
  const optionsByPost = new Map<number, NonNullable<FeedPost["poll"]>>();
  for (const option of pollOptions ?? []) {
    const current = optionsByPost.get(option.post_id) ?? {
      options: [],
      myVotes: myVotesByPost.get(option.post_id) ?? [],
      multiple: false,
      total: votersByPost.get(option.post_id)?.size ?? 0,
    };
    const votes = votesByOption.get(option.id) ?? 0;
    current.options.push({ id: option.id, label: option.label, votes });
    optionsByPost.set(option.post_id, current);
  }

  const feedPosts: FeedPost[] = (posts ?? []).map((post) => ({
    ...post,
    imageUrl: post.image_url,
    startsOn: post.starts_on,
    closedAt: post.closed_at,
    soldAt: post.sold_at,
    replies: repliesByPost.get(post.id) ?? [],
    reactions: reactionsByPost.get(post.id) ?? { helpful: 0, thanks: 0, mine: null },
    rsvp: post.kind === "event" ? rsvpByPost.get(post.id) ?? { count: 0, going: false } : null,
    poll:
      post.kind === "poll"
        ? {
            ...(optionsByPost.get(post.id) ?? { options: [], myVotes: [], total: 0 }),
            multiple: Boolean(post.poll_multiple),
            myVotes: myVotesByPost.get(post.id) ?? [],
            total: votersByPost.get(post.id)?.size ?? 0,
          }
        : null,
  })).filter((post) => {
    if (post.kind === "event") return eventAccess !== "none";
    if (post.kind === "poll") return pollAccess !== "none";
    return feedAccess !== "none";
  });
  const [hiddenKinds, labels] = await Promise.all([disabledCommunityKinds(), loadCategoryLabels()]);

  return (
    <section className="page-gutter max-w-2xl py-5 md:py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a]">Updates</h1>
      <UpdatesBoard
        posts={feedPosts}
        notices={notices}
        userId={user.id}
        canModerate={canManageAdmin(profile.role, user)}
        canWrite={feedAccess === "manage"}
        canPostFeed={feedAccess === "manage"}
        canPostEvents={eventAccess === "manage"}
        canPostPolls={pollAccess === "manage"}
        canPostNotices={canManageAdmin(profile.role, user) && noticeAccess === "manage"}
        showNotices={noticeAccess !== "none"}
        showEvents={eventAccess !== "none"}
        showPolls={pollAccess !== "none"}
        showFeed={feedAccess !== "none"}
        initialSlice={initialSlice}
        hiddenKinds={hiddenKinds}
        labels={labels}
      />
    </section>
  );
}
