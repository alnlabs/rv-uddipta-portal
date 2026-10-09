import { openNotification, markNotificationRead } from "@/app/actions/activity";
import { visibleText } from "@/lib/richText";

type InboxRow = {
  id: number
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
};

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

export function InboxList({
  rows,
  empty,
}: {
  readonly rows: InboxRow[]
  readonly empty: string
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-2xl bg-[#ffffff] px-4 py-8 text-center text-sm text-[#475569] ring-1 ring-[rgba(15,23,42,0.1)]">
        {empty}
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`rounded-2xl px-4 py-3 ring-1 ${
            row.read_at
              ? "bg-[#ffffff] ring-[rgba(15,23,42,0.08)]"
              : "bg-[#ffffff] ring-[rgba(5,150,105,0.35)]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0f172a]">{row.title}</p>
              {row.body ? <p className="mt-0.5 text-sm text-[#475569]">{visibleText(row.body)}</p> : null}
              <p className="mt-1 text-xs text-[#475569]">{relativeTime(row.created_at)}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {row.href ? (
                <form action={openNotification}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="href" value={row.href} />
                  <button type="submit" className="text-xs font-semibold text-[#1e293b] underline">
                    Open
                  </button>
                </form>
              ) : null}
              {!row.read_at ? (
                <form action={markNotificationRead.bind(null, row.id)}>
                  <button type="submit" className="text-xs font-semibold text-[#b45309]">
                    Mark read
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
