import { redirect } from "next/navigation";
import { postBuilderUpdate } from "@/app/actions/activity";
import { UpdatesBoard, type FeedPost } from "@/components/UpdatesBoard";
import { isSuperAdmin } from "@/lib/admin";
import { canEditBuilder, canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function FeedPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  const community = isCommunityRole(profile.role) || isSuperAdmin(user);
  if (!community) redirect("/register");

  const admin = createAdminClient();
  const [{ data: posts }, { data: replies }, { data: notices }] = await Promise.all([
    admin
      .from("member_posts")
      .select("id, author_user_id, author_name, flat_number, body, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("member_replies")
      .select("id, post_id, author_user_id, author_name, flat_number, body")
      .order("created_at", { ascending: true }),
    admin
      .from("activity_events")
      .select("id, title, body, created_at, kind")
      .eq("kind", "builder_update")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const repliesByPost = new Map<number, FeedPost["replies"]>();
  for (const reply of replies ?? []) {
    const list = repliesByPost.get(reply.post_id) ?? [];
    list.push(reply);
    repliesByPost.set(reply.post_id, list);
  }

  const feedPosts: FeedPost[] = (posts ?? []).map((post) => ({
    ...post,
    replies: repliesByPost.get(post.id) ?? [],
  }));

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="text-sm font-semibold text-[#7a5c22]">Updates</p>
      <h1 className="mt-2 font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
        Updates
      </h1>
      <p className="mt-3 max-w-xl text-base text-[#3d5247]">
        News from the building. You can post, send a request, or send feedback.
      </p>

      {canEditBuilder(profile.role, user) ? (
        <form
          action={postBuilderUpdate}
          className="mt-8 space-y-3 border-y border-[rgba(27,58,47,0.1)] py-6"
        >
          <p className="text-sm font-semibold text-[#14241c]">Notice</p>
          <p className="text-sm text-[#3d5247]">
            A notice is from the admin or the builder. Members cannot post a notice.
          </p>
          <input
            name="title"
            required
            minLength={3}
            placeholder="Title"
            className="min-h-12 w-full border-b border-[rgba(27,58,47,0.14)] bg-transparent px-0 text-base outline-none"
          />
          <textarea
            name="body"
            rows={3}
            placeholder="Details"
            className="w-full border-b border-[rgba(27,58,47,0.14)] bg-transparent px-0 py-2 text-base outline-none"
          />
          <button type="submit" className="min-h-12 text-base font-semibold text-[#1b3a2f]">
            Post notice
          </button>
        </form>
      ) : null}

      <UpdatesBoard
        posts={feedPosts}
        notices={notices ?? []}
        userId={user.id}
        canModerate={canManageAdmin(profile.role, user)}
      />
    </section>
  );
}
