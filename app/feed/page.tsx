import { redirect } from "next/navigation";
import { deleteAnnouncement, pinAnnouncement, postAnnouncement } from "@/app/actions/activity";
import { Form, SwitchField, TextAreaField, TextField } from "@/components/form-ui";
import { outboundChannels } from "@/lib/reach";
import { UpdatesBoard, type FeedPost } from "@/components/UpdatesBoard";
import { isSuperAdmin } from "@/lib/admin";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function FeedPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  const community = isCommunityRole(profile.role) || isSuperAdmin(user);
  if (!community) redirect("/register");

  const admin = createAdminClient();
  const [{ data: posts }, { data: replies }, { data: pinnedNotices }, { data: recentNotices }] =
    await Promise.all([
    admin
      .from("member_posts")
      .select("id, author_user_id, author_name, flat_number, kind, body, created_at, image_url, starts_on, closed_at, sold_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("member_replies")
      .select("id, post_id, author_user_id, author_name, flat_number, body")
      .order("created_at", { ascending: true }),
    admin
      .from("activity_events")
      .select("id, title, body, created_at, kind, pinned")
      .eq("pinned", true)
      .in("kind", ["announcement", "builder_update"])
      .order("created_at", { ascending: false }),
    admin
      .from("activity_events")
      .select("id, title, body, created_at, kind, pinned")
      .eq("pinned", false)
      .in("kind", ["announcement", "builder_update"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const notices = [...(pinnedNotices ?? []), ...(recentNotices ?? [])];

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
  const myVoteByPost = new Map<number, number>();
  for (const vote of pollVotes ?? []) {
    votesByOption.set(vote.option_id, (votesByOption.get(vote.option_id) ?? 0) + 1);
    if (vote.user_id === user.id) myVoteByPost.set(vote.post_id, vote.option_id);
  }
  const optionsByPost = new Map<number, NonNullable<FeedPost["poll"]>>();
  for (const option of pollOptions ?? []) {
    const current = optionsByPost.get(option.post_id) ?? {
      options: [],
      myVote: myVoteByPost.get(option.post_id) ?? null,
      total: 0,
    };
    const votes = votesByOption.get(option.id) ?? 0;
    current.options.push({ id: option.id, label: option.label, votes });
    current.total += votes;
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
    poll: post.kind === "poll" ? optionsByPost.get(post.id) ?? { options: [], myVote: null, total: 0 } : null,
  }));
  const channels = outboundChannels();

  return (
    <section className="page-gutter max-w-6xl py-5 md:py-8">
      <p className="eyebrow">Updates</p>
      <h1 className="mt-1 text-[clamp(1.6rem,6vw,2.2rem)] font-semibold leading-none tracking-tight text-[#14241c]">
        Updates
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#3d5247] sm:text-base">
        Share an update, a question, a poll, something for sale, a lost item, or an event. A request or feedback goes only to the admin.
      </p>

      {notices.length ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-[#14241c]">Announcements</h2>
          <ul className="mt-3 grid gap-3">
            {notices.map((notice) => (
              <li
                key={notice.id}
                className="rounded-[1.35rem] border-l-4 border-[#c9a45c] bg-[#fffcf5] p-4 shadow-[inset_0_0_0_1px_rgba(27,58,47,0.08)]"
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
                  {notice.pinned ? "Pinned · " : ""}
                  {notice.kind === "announcement" ? "Announcement" : "Notice"}
                  {" · "}
                  {new Date(notice.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#14241c]">{notice.title}</p>
                {notice.body ? <p className="mt-1 text-[#3d5247]">{notice.body}</p> : null}
                {canManageAdmin(profile.role, user) ? (
                  <div className="mt-2 flex gap-4">
                    <form action={pinAnnouncement}>
                      <input type="hidden" name="id" value={notice.id} />
                      <input type="hidden" name="pinned" value={notice.pinned ? "false" : "true"} />
                      <button type="submit" className="text-sm font-semibold text-[#1b3a2f]">
                        {notice.pinned ? "Unpin" : "Pin"}
                      </button>
                    </form>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={notice.id} />
                      <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">
                        Remove
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canManageAdmin(profile.role, user) ? (
        <Form
          action={postAnnouncement}
          success="Announcement posted."
          resetOnSuccess
          className="field-panel mt-5 grid gap-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-[#14241c]">Post an announcement</h2>
            <p className="mt-1 text-sm text-[#3d5247]">
              Everyone in the community gets this in Notifications.
              {channels.email ? " It is also emailed." : ""}
              {channels.whatsapp ? " It is also sent on WhatsApp." : ""}
              {" "}
              Only an admin can post one. Pin it to keep it at the top.
            </p>
          </div>
          <TextField label="Title" name="title" required minLength={3} placeholder="Title" />
          <TextAreaField label="Details" name="body" rows={3} placeholder="Details" />
          <SwitchField name="pin" label="Pin at the top" hint="It stays there until you unpin or remove it." />
          <button type="submit" className="btn btn-forest w-full sm:w-fit">
            Post announcement
          </button>
        </Form>
      ) : null}

      <UpdatesBoard
        posts={feedPosts}
        userId={user.id}
        canModerate={canManageAdmin(profile.role, user)}
      />
    </section>
  );
}
