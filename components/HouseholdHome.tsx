import Link from "next/link";
import type { FlatMember, FlatRenter, OwnedFlat } from "@/lib/types";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";

export function HouseholdHome({
  kind,
  name,
  flat,
  members,
  renters,
  needsAction,
  todayItems,
}: {
  kind: "family" | "tenant"
  name: string | null
  flat: OwnedFlat
  members: FlatMember[]
  renters: FlatRenter[]
  needsAction: { title: string; detail: string; href: string }[]
  todayItems: { title: string; when: string; href: string }[]
}) {
  const hello = name ? `Hello, ${name.split(" ")[0]}` : "Hello";
  const living = kind === "tenant" ? "You live in this home." : "You are family in this home.";

  return (
    <section className="page-gutter max-w-5xl py-8 md:py-12">
      <p className="text-sm text-[#b45309]">{hello}</p>
      <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-[#b45309] uppercase">
        {kind === "tenant" ? "Tenant home" : "Family home"}
      </p>
      <h1 className="mt-1 text-5xl font-semibold tracking-tight text-[#0f172a]">{flat.flatNumber}</h1>
      <p className="mt-2 max-w-xl text-[#475569]">
        {living} The owner keeps the home records. You can use the community, visitors, and papers.
      </p>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="slab p-4">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Needs action</h2>
          {needsAction.length ? (
            <ul className="mt-3 grid gap-3">
              {needsAction.map((item) => (
                <li key={item.title}>
                  <Link href={item.href}>
                    <span className="font-semibold text-[#0f172a]">{item.title}</span>
                    <span className="mt-1 block text-sm text-[#475569]">{item.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#475569]">Nothing is waiting on you.</p>
          )}
        </div>
        <div className="slab p-4">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">Today</h2>
          {todayItems.length ? (
            <ul className="mt-3 grid gap-3">
              {todayItems.map((item) => (
                <li key={item.title}>
                  <Link href={item.href}>
                    <span className="font-semibold text-[#0f172a]">{item.title}</span>
                    <span className="mt-1 block text-sm text-[#475569]">{item.when}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#475569]">No events dated for today.</p>
          )}
        </div>
      </section>

      <section className="slab mt-6 p-4">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">This home</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-[#64748b]">Type</dt>
            <dd className="font-semibold text-[#0f172a]">{typeLabel(flat.type)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748b]">Floor</dt>
            <dd className="font-semibold text-[#0f172a]">{flat.floor}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748b]">Facing</dt>
            <dd className="font-semibold text-[#0f172a]">{flat.facing ? facingLabel(flat.facing) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#64748b]">Owner</dt>
            <dd className="font-semibold text-[#0f172a]">{flat.ownerName || "Owner"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">People here</h2>
        <ul className="mt-3 grid gap-2">
          {members.map((member) => (
            <li key={member.id} className="slab px-4 py-3 text-[#0f172a]">
              {member.name}
            </li>
          ))}
          {kind === "tenant"
            ? renters.map((renter) => (
                <li key={renter.id} className="slab px-4 py-3 text-[#0f172a]">
                  {renter.name} · tenant
                </li>
              ))
            : null}
          {!members.length && !(kind === "tenant" && renters.length) ? (
            <li className="text-sm text-[#475569]">No other names are listed yet.</li>
          ) : null}
        </ul>
      </section>

      <p className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[#1e293b]">
        <Link href="/feed">Updates</Link>
        <Link href="/visitors">Visitor passes</Link>
        <Link href="/documents">Home records</Link>
        <Link href="/community">Building</Link>
      </p>
    </section>
  );
}
