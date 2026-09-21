import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/activity";
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

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unread = (rows ?? []).filter((row) => !row.read_at).length;

  return (
    <section className="page-gutter max-w-5xl py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            Inbox
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-[#3d5247]">
            {unread ? `${unread} unread` : "You are up to date"}
          </p>
        </div>
        {unread ? (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="min-h-11 rounded-full border border-[rgba(27,58,47,0.14)] px-4 text-sm font-semibold text-[#1b3a2f]"
            >
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-[#8a2f2f]">{error.message}</p> : null}

      <ul className="mt-6 space-y-2">
        {(rows ?? []).length === 0 ? (
          <li className="rounded-2xl bg-[#fffcf5] px-4 py-8 text-center text-sm text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
            No notifications yet.
          </li>
        ) : (
          (rows ?? []).map((row) => (
            <li
              key={row.id}
              className={`rounded-2xl px-4 py-3 ring-1 ${
                row.read_at
                  ? "bg-[#fffcf5] ring-[rgba(27,58,47,0.08)]"
                  : "bg-[#fffcf5] ring-[rgba(201,164,92,0.35)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#14241c]">{row.title}</p>
                  {row.body ? (
                    <p className="mt-0.5 text-sm text-[#3d5247]">{row.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#3d5247]">
                    {relativeTime(row.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="text-xs font-semibold text-[#1b3a2f] underline"
                    >
                      Open
                    </Link>
                  ) : null}
                  {!row.read_at ? (
                    <form action={markNotificationRead.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="text-xs font-semibold text-[#7a5c22]"
                      >
                        Mark read
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
