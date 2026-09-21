import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { postBuilderUpdate } from "@/app/actions/activity";
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
  const community = isCommunityRole(profile.role);
  const canPost = canEditBuilder(profile.role, user);

  let query = supabase
    .from("activity_events")
    .select("id, kind, title, body, visibility, created_at, flat_id, actor_user_id")
    .order("created_at", { ascending: false })
    .limit(80);

  if (!community) {
    query = query.eq("visibility", "public");
  }

  const { data: events, error } = await query;

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
    <section className="mx-auto w-[calc(100%-1.25rem)] max-w-5xl py-6 md:w-[calc(100%-2.5rem)] md:py-10">
      <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
        Community
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
        Feed
      </h1>
      <p className="mt-2 text-sm text-[#3d5247]">
        Updates from owners and the builder
        {!community ? " (public events only)" : ""}.
      </p>

      {canPost ? (
        <form
          action={postBuilderUpdate}
          className="mt-6 space-y-3 rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]"
        >
          <p className="text-xs font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
            Announcement
          </p>
          <input
            name="title"
            required
            minLength={3}
            placeholder="Title"
            className="min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm"
          />
          <textarea
            name="body"
            rows={3}
            placeholder="Optional details"
            className="w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="min-h-11 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
          >
            Post to feed
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <ul className="mt-6 space-y-3">
        {(events ?? []).length === 0 ? (
          <li className="rounded-2xl bg-[#fffcf5] px-4 py-8 text-center text-sm text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
            No updates yet. Listing and journey changes will appear here.
          </li>
        ) : (
          (events ?? []).map((event) => (
            <li
              key={event.id}
              className="rounded-2xl bg-[#fffcf5] px-4 py-3.5 ring-1 ring-[rgba(27,58,47,0.1)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
                  {event.kind.replaceAll("_", " ")}
                  {event.flat_id && flatLabels[event.flat_id]
                    ? ` · ${flatLabels[event.flat_id]}`
                    : ""}
                </p>
                <time className="text-xs text-[#3d5247]">
                  {relativeTime(event.created_at)}
                </time>
              </div>
              <h2 className="mt-1 text-base font-semibold text-[#14241c]">
                {event.title}
              </h2>
              {event.body ? (
                <p className="mt-1 text-sm text-[#3d5247]">{event.body}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
