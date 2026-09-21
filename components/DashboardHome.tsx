import Link from "next/link";
import { summarize } from "@/lib/flats";
import { typeLabel } from "@/lib/flatDisplay";
import type { PublicFlat } from "@/lib/types";

export type DashboardActivity = {
  id: number
  title: string
  body: string | null
  kind: string
  createdAt: string
  flatNumber: string | null
};

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <li className="rounded-2xl bg-[#fffcf5] px-3 py-3 ring-1 ring-[rgba(27,58,47,0.12)]">
      <strong className="block text-2xl text-[#1b3a2f]">{value}</strong>
      <span className="text-sm text-[#3d5247]">{label}</span>
    </li>
  );
}

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

function ListingList({
  title,
  flats,
  includeOwners,
  empty,
}: {
  title: string
  flats: PublicFlat[]
  includeOwners: boolean
  empty: string
}) {
  return (
    <section className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-[#14241c]">
          {title}
        </h2>
        <span className="text-sm font-semibold text-[#3d5247]">{flats.length}</span>
      </div>
      {flats.length === 0 ? (
        <p className="mt-3 text-sm text-[#3d5247]">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.08)]">
          {flats.slice(0, 12).map((flat) => (
            <li
              key={flat.flatNumber}
              className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
            >
              <div>
                <strong className="text-[#14241c]">{flat.flatNumber}</strong>
                <p className="text-sm text-[#3d5247]">
                  {typeLabel(flat.type)}
                  {flat.wing ? ` · Wing ${flat.wing}` : ""}
                  {` · Floor ${flat.floor}`}
                  {flat.areaSqft ? ` · ${flat.areaSqft.toLocaleString()} sft` : ""}
                </p>
              </div>
              {includeOwners && flat.ownerName ? (
                <p className="text-sm font-medium text-[#2f5a48]">
                  {flat.ownerName}
                  {flat.phoneMasked ? (
                    <span className="mt-0.5 block text-xs tabular-nums text-[#3d5247]">
                      {flat.phoneMasked}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function typeCounts(flats: PublicFlat[]) {
  let two = 0;
  let three = 0;
  let other = 0;
  for (const flat of flats) {
    const t = flat.type.toLowerCase();
    if (t.includes("2") || t.includes("two")) two += 1;
    else if (t.includes("3") || t.includes("three")) three += 1;
    else other += 1;
  }
  return { two, three, other };
}

function wingBreakdown(flats: PublicFlat[]) {
  const map = new Map<string, { sold: number; unsold: number; total: number }>();
  for (const flat of flats) {
    const wing = flat.wing || "—";
    const row = map.get(wing) ?? { sold: 0, unsold: 0, total: 0 };
    row.total += 1;
    if (flat.saleStatus === "sold") row.sold += 1;
    else row.unsold += 1;
    map.set(wing, row);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wing, counts]) => ({ wing, ...counts }));
}

export function DashboardHome({
  flats,
  includeOwners,
  myFlatNumber,
  recentActivity = [],
}: {
  flats: PublicFlat[]
  includeOwners: boolean
  myFlatNumber?: string | null
  recentActivity?: DashboardActivity[]
}) {
  const summary = summarize(flats);
  const openRent = flats.filter((f) => f.openForRent);
  const openResale = flats.filter((f) => f.openForResale);
  const types = typeCounts(flats);
  const soldTypes = typeCounts(flats.filter((f) => f.saleStatus === "sold"));
  const wings = wingBreakdown(flats);
  const myFlat = myFlatNumber
    ? flats.find((f) => f.flatNumber === myFlatNumber) ?? null
    : null;
  const soldPct =
    flats.length > 0 ? Math.round((summary.sold / flats.length) * 100) : 0;

  return (
    <div className="page-gutter max-w-6xl py-5 md:py-8">
      <header className="flex flex-col gap-4 border-b border-[rgba(27,58,47,0.1)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            Live community data
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c] md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#3d5247] md:text-base">
            Sales, stay, possession progress, listings, and recent activity from
            linked flats.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/community"
            className="inline-flex min-h-11 items-center rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
          >
            Community floors
          </Link>
          <Link
            href="/community?view=3d"
            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(27,58,47,0.14)] px-4 text-sm font-semibold text-[#1b3a2f]"
          >
            Community 3D
          </Link>
          {myFlatNumber ? (
            <Link
              href="/update"
              className="inline-flex min-h-11 items-center rounded-full bg-[#c9a45c] px-4 text-sm font-semibold text-[#14241c]"
            >
              My flat {myFlatNumber}
            </Link>
          ) : null}
        </div>
      </header>

      {myFlat ? (
        <Link
          href="/update"
          className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#14241c] px-4 py-4 text-[#f7f2e6] sm:flex-row sm:items-center sm:justify-between md:px-5"
        >
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
              Your flat
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-[#f7f2e6]">
              {myFlat.flatNumber}
              {myFlat.ownerName ? (
                <span className="ml-2 text-base font-medium text-[#e8d5a3]">
                  · {myFlat.ownerName}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-[#d0c090]">
              {typeLabel(myFlat.type)}
              {myFlat.wing ? ` · Wing ${myFlat.wing}` : ""}
              {` · Floor ${myFlat.floor}`}
              {myFlat.occupancy === "rented"
                ? " · Rented"
                : myFlat.occupancy === "owner_stay"
                  ? " · Owner stay"
                  : ""}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#c9a45c]">
            Manage journey →
          </span>
        </Link>
      ) : null}

      <section className="mt-5" aria-label="Sales snapshot">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
          Sales & stay
        </h2>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 md:gap-3">
          <StatCard value={flats.length} label="Flats tracked" />
          <StatCard value={summary.sold} label="Sold" />
          <StatCard value={summary.unsold} label="Unsold" />
          <StatCard value={`${soldPct}%`} label="Sold rate" />
          {includeOwners ? (
            <>
              <StatCard value={summary.ownerStay} label="Owner stay" />
              <StatCard value={summary.rented} label="Rented" />
            </>
          ) : null}
          <StatCard value={summary.openForRent} label="Open for rent" />
          <StatCard value={summary.openForResale} label="Open for resale" />
        </ul>
      </section>

      {includeOwners ? (
        <section className="mt-5" aria-label="Possession progress">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
            Possession journey
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
            <StatCard
              value={summary.registrationCompleted}
              label="Registered"
            />
            <StatCard
              value={summary.interiorInProgress}
              label="Interior on"
            />
            <StatCard
              value={summary.interiorCompleted}
              label="Interior done"
            />
            <StatCard
              value={summary.ceremonyCompleted}
              label="Ceremony done"
            />
            <StatCard value={summary.movedIn} label="Moved in" />
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
          <h2 className="text-lg font-semibold tracking-tight text-[#14241c]">
            Unit mix
          </h2>
          <p className="mt-1 text-sm text-[#3d5247]">From current flat records</p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-[#14241c]">2 BHK</span>
              <span className="text-sm text-[#3d5247]">
                <strong className="text-[#1b3a2f]">{types.two}</strong>
                {includeOwners ? (
                  <span className="ml-1">· {soldTypes.two} sold</span>
                ) : null}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-[#14241c]">3 BHK</span>
              <span className="text-sm text-[#3d5247]">
                <strong className="text-[#1b3a2f]">{types.three}</strong>
                {includeOwners ? (
                  <span className="ml-1">· {soldTypes.three} sold</span>
                ) : null}
              </span>
            </li>
            {types.other > 0 ? (
              <li className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-[#14241c]">Other</span>
                <strong className="text-sm text-[#1b3a2f]">{types.other}</strong>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)] md:p-5">
          <h2 className="text-lg font-semibold tracking-tight text-[#14241c]">
            By wing
          </h2>
          <p className="mt-1 text-sm text-[#3d5247]">Sold vs unsold</p>
          <ul className="mt-4 space-y-3">
            {wings.map((row) => (
              <li key={row.wing}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-[#14241c]">
                    Wing {row.wing}
                  </span>
                  <span className="text-sm text-[#3d5247]">
                    {row.sold}/{row.total} sold
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(27,58,47,0.08)]">
                  <div
                    className="h-full rounded-full bg-[#1b3a2f]"
                    style={{
                      width: `${row.total ? Math.round((row.sold / row.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListingList
          title="Open for rent"
          flats={openRent}
          includeOwners={includeOwners}
          empty="No flats are marked open for rent yet."
        />
        <ListingList
          title="Open for resale"
          flats={openResale}
          includeOwners={includeOwners}
          empty="No flats are marked open for resale yet."
        />
      </div>

      <section className="mt-4 rounded-2xl bg-[#fffcf5]5 p-4 ring-1 ring-[rgba(27,58,47,0.1)] md:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-[#14241c]">
            Recent activity
          </h2>
          <Link
            href="/feed"
            className="text-sm font-semibold text-[#2f5a48] hover:underline"
          >
            Full feed
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-[#3d5247]">
            No recent community updates yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.08)]">
            {recentActivity.map((item) => (
              <li key={item.id} className="py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-[#14241c]">{item.title}</p>
                  <span className="text-xs text-[#3d5247]">
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
                {item.body ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-[#3d5247]">
                    {item.body}
                  </p>
                ) : null}
                {item.flatNumber ? (
                  <p className="mt-0.5 text-xs font-semibold text-[#2f5a48]">
                    {item.flatNumber}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
