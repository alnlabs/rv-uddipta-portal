import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { postBuilderUpdate } from "@/app/actions/activity";
import { isSuperAdmin } from "@/lib/admin";
import { canEditBuilder, ensureProfile, isCommunityRole } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function FeedPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(user, supabase);
  const community = isCommunityRole(profile.role) || isSuperAdmin(user);
  if (!community) redirect("/");
  const canPost = canEditBuilder(profile.role, user);

  const { data: events, error } = await supabase
    .from("activity_events")
    .select("id, kind, title, body, visibility, created_at, flat_id, actor_user_id")
    .order("created_at", { ascending: false })
    .limit(80);

  const flatIds = [
    ...new Set(
      (events ?? [])
        .map((e) => e.flat_id as number | null)
        .filter((id): id is number => id != null),
    ),
  ];
  const flatLabels: Record<number, string> = {};
  if (flatIds.length) {
    const { data: flats } = await supabase
      .from("flats")
      .select("id, flat_number")
      .in("id", flatIds);
    for (const row of flats ?? []) {
      flatLabels[row.id] = row.flat_number;
    }
  }

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      <h1 className="font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
        Feed
      </h1>
      <p className="mt-3 max-w-xl text-base text-[#3d5247]">
        Updates from owners and the builder
        {!community ? " (public events only)" : ""}.
      </p>

      {canPost ? (
        <form
          action={postBuilderUpdate}
          className="mt-8 space-y-3 border-y border-[rgba(27,58,47,0.1)] py-6"
        >
          <p className="text-sm font-semibold text-[#14241c]">Announcement</p>
          <input
            name="title"
            required
            minLength={3}
            placeholder="Title"
            className="min-h-11 w-full border-b border-[rgba(27,58,47,0.14)] bg-transparent px-0 text-sm outline-none"
          />
          <textarea
            name="body"
            rows={3}
            placeholder="Optional details"
            className="w-full border-b border-[rgba(27,58,47,0.14)] bg-transparent px-0 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="min-h-11 text-sm font-semibold text-[#1b3a2f]"
          >
            Post to feed
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <ul className="mt-8 divide-y divide-[rgba(27,58,47,0.08)]">
        {(events ?? []).length === 0 ? (
          <li className="py-8 text-sm text-[#3d5247]">
            No updates yet. Listing and journey changes will appear here.
          </li>
        ) : (
          (events ?? []).map((event) => (
            <li key={event.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-[#14241c]">
                  {event.title}
                </h2>
                <time className="text-sm text-[#3d5247]">
                  {relativeTime(event.created_at)}
                </time>
              </div>
              <p className="mt-1 text-sm text-[#3d5247]">
                {event.kind.replaceAll("_", " ")}
                {event.flat_id && flatLabels[event.flat_id]
                  ? ` · ${flatLabels[event.flat_id]}`
                  : ""}
              </p>
              {event.body ? (
                <p className="mt-2 text-sm text-[#3d5247]">{event.body}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
