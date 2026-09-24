import Link from "next/link";
import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";

export type AdminHomeStats = {
  pending: number
  sold: number
  unsold: number
  named: number
  linked: number
  profiles: number
};

const TOOLS = [
  {
    href: "/account#approvals",
    title: "Approvals",
    hint: (s: AdminHomeStats) =>
      s.pending ? `${s.pending} waiting to link a flat` : "Inbox is clear",
  },
  {
    href: "/account/owners",
    title: "Owners",
    hint: (s: AdminHomeStats) =>
      `${s.named} named · ${s.sold} sold · ${s.unsold} unsold`,
  },
  {
    href: "/account/roles",
    title: "People",
    hint: (s: AdminHomeStats) =>
      `${s.profiles} Google account${s.profiles === 1 ? "" : "s"}`,
  },
  {
    href: "/account/builder",
    title: "Builder",
    hint: () => "Public project facts and amenities",
  },
  {
    href: "/designer",
    title: "Designer",
    hint: () => "Numbered 2D grid and prompt files",
  },
  {
    href: "/members",
    title: "Members",
    hint: (s: AdminHomeStats) =>
      `${s.linked} linked login${s.linked === 1 ? "" : "s"}`,
  },
  {
    href: "/community",
    title: "Community",
    hint: () => "Floor board and 3D model",
  },
] as const;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li className="rounded-2xl bg-[#fffcf5] px-3 py-3 ring-1 ring-[rgba(27,58,47,0.12)]">
      <strong className="block text-2xl text-[#1b3a2f]">{value}</strong>
      <span className="text-sm text-[#3d5247]">{label}</span>
    </li>
  );
}

export function AdminHome({
  stats,
  requests,
  loadError,
}: {
  readonly stats: AdminHomeStats
  readonly requests: AdminRegistrationRequest[]
  readonly loadError?: string | null
}) {
  return (
    <section>
      <header className="border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Administration
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Admin
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#3d5247]">
          Approve new owners, edit flats, set who can sign in, and keep
          brochure facts current.
        </p>
      </header>

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 md:gap-3">
        <Stat value={stats.pending} label="Pending" />
        <Stat value={stats.sold} label="Sold" />
        <Stat value={stats.unsold} label="Unsold" />
        <Stat value={stats.named} label="Named owners" />
        <Stat value={stats.linked} label="Linked logins" />
        <Stat value={stats.profiles} label="Accounts" />
      </ul>

      <h2 className="mt-8 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
        Shortcuts
      </h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="flex min-h-[6.5rem] flex-col justify-between rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)] transition-colors hover:bg-[#fff8ea]"
            >
              <span className="text-lg font-semibold tracking-tight text-[#14241c]">
                {tool.title}
              </span>
              <span className="mt-2 text-sm text-[#3d5247]">{tool.hint(stats)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div id="approvals" className="mt-10 scroll-mt-24">
        {loadError ? <p className="mb-4 text-[#8a2f2f]">{loadError}</p> : null}
        <ApprovalsList requests={requests} embedded />
      </div>
    </section>
  );
}
