import { redirect } from "next/navigation";
import { postBuilderUpdate } from "@/app/actions/activity";
import { Form, TextAreaField, TextField } from "@/components/form-ui";
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
    <section className="page-gutter max-w-6xl py-5 md:py-8">
      <p className="eyebrow">Updates</p>
      <h1 className="mt-1 text-[clamp(1.6rem,6vw,2.2rem)] font-semibold leading-none tracking-tight text-[#14241c]">
        Updates
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#3d5247] sm:text-base">
        News from the building. You can post, send a request, or send feedback.
      </p>

      {canEditBuilder(profile.role, user) ? (
        <Form
          action={postBuilderUpdate}
          success="Notice posted."
          resetOnSuccess
          className="field-panel mt-5 grid gap-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-[#14241c]">Notice</h2>
            <p className="mt-1 text-sm text-[#3d5247]">
              A notice is from the admin or the builder. Members cannot post a notice.
            </p>
          </div>
          <TextField label="Title" name="title" required minLength={3} placeholder="Title" />
          <TextAreaField label="Details" name="body" rows={3} placeholder="Details" />
          <button type="submit" className="btn btn-forest w-full sm:w-fit">
            Post notice
          </button>
        </Form>
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
