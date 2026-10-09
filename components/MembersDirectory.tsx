"use client";

import { useMemo, useState } from "react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";

export type MemberPerson = {
  name: string
  photoUrl: string | null
};

export type MemberRenter = {
  name: string
  phoneMasked: string
  startDate: string | null
  endDate: string | null
  current: boolean
};

export type MemberCard = {
  flatNumber: string
  wing: string
  floor: number
  type: string
  facing: string
  areaSqft: number | null
  ownerName: string
  ownerPhotoUrl: string | null
  ownerEmail: string
  phoneMasked: string
  tenantName: string
  tenantPhoneMasked: string
  members: MemberPerson[]
  renters: MemberRenter[]
  registrationDate: string | null
  interiorStartDate: string | null
  interiorDate: string | null
  ceremonyDate: string | null
  movingDate: string | null
  occupancyLabel: string
  statusLabel: string | null
  openForRent: boolean
  openForResale: boolean
  ownerRegistered: boolean
};

type Filter = "all" | "staying" | "family" | "tenants";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "staying", label: "Owner living here" },
  { id: "family", label: "With family" },
  { id: "tenants", label: "With a tenant" },
];

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function stayLabel(renter: MemberRenter) {
  const start = formatDate(renter.startDate);
  const end = formatDate(renter.endDate);
  if (start && end) return `${start} to ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return null;
}

function matches(flat: MemberCard, query: string) {
  if (!query) return true;
  const hay = [
    flat.flatNumber,
    flat.ownerName,
    flat.tenantName,
    ...flat.members.map((member) => member.name),
    ...flat.renters.map((renter) => renter.name),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function matchesFilter(flat: MemberCard, filter: Filter) {
  if (filter === "staying") return flat.occupancyLabel === "Owner stay";
  if (filter === "family") return flat.members.length > 0;
  if (filter === "tenants") return Boolean(flat.tenantName) || flat.renters.some((renter) => renter.current);
  return true;
}

function peopleLine(flat: MemberCard) {
  const bits: string[] = [];
  if (flat.members.length) {
    bits.push(flat.members.map((member) => member.name).slice(0, 2).join(", "));
    if (flat.members.length > 2) bits[bits.length - 1] += ` +${flat.members.length - 2}`;
  }
  if (flat.tenantName) bits.push(`Tenant ${flat.tenantName}`);
  return bits.join(" · ");
}

export function MembersDirectory({
  flats,
  initialQuery = "",
}: {
  readonly flats: MemberCard[]
  readonly initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [openNumber, setOpenNumber] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();

  const homes = useMemo(
    () =>
      flats
        .filter((flat) => matches(flat, needle) && matchesFilter(flat, filter))
        .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true })),
    [flats, needle, filter],
  );
  const wings = [...new Set(homes.map((flat) => flat.wing || "A"))];
  const open = homes.find((flat) => flat.flatNumber === openNumber) ?? null;

  return (
    <div className="mt-6">
      <label className="block max-w-xl">
        <span className="field-label">Find a neighbour</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or home number"
          className="field-control mt-2"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={
              filter === item.id
                ? "inline-flex min-h-11 items-center rounded-full bg-[#1e293b] px-4 text-sm font-semibold text-[#f8fafc]"
                : "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
            }
          >
            {item.label}
          </button>
        ))}
        <p className="inline-flex min-h-11 items-center text-sm text-[#475569]">
          {homes.length} {homes.length === 1 ? "home" : "homes"}
        </p>
      </div>

      {open ? (
        <article className="slab mt-5 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar name={open.ownerName} photoUrl={open.ownerPhotoUrl} size="lg" />
              <div className="min-w-0">
                <p className="text-sm text-[#475569]">
                  Wing {open.wing || "A"} · Floor {open.floor}
                  {open.type ? ` · ${typeLabel(open.type)}` : ""}
                  {open.facing ? ` · ${facingLabel(open.facing)}` : ""}
                  {open.areaSqft ? ` · ${open.areaSqft.toLocaleString()} sft` : ""}
                </p>
                <h2 className="text-2xl font-semibold text-[#0f172a]">{open.flatNumber}</h2>
                <p className="text-sm text-[#475569]">{open.occupancyLabel}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpenNumber(null)} className="btn-line">
              Close
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Owner</p>
              <p className="mt-1 font-semibold text-[#0f172a]">{open.ownerName}</p>
              {open.phoneMasked ? <p className="text-sm text-[#475569]">{open.phoneMasked}</p> : null}
              {open.ownerEmail ? (
                <a href={`mailto:${open.ownerEmail}`} className="text-sm text-[#1e293b] underline decoration-[#cbd5e1] underline-offset-4">
                  {open.ownerEmail}
                </a>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Family</p>
              {open.members.length ? (
                <ul className="mt-1 grid gap-2">
                  {open.members.map((member) => (
                    <li key={member.name} className="flex items-center gap-2">
                      <ProfileAvatar name={member.name} photoUrl={member.photoUrl} size="sm" tone="member" />
                      <span className="text-[#0f172a]">{member.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-[#475569]">No family listed.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#64748b]">Tenant</p>
              {open.tenantName || open.renters.length ? (
                <ul className="mt-1 grid gap-2">
                  {open.tenantName ? (
                    <li>
                      <p className="font-semibold text-[#0f172a]">{open.tenantName}</p>
                      {open.tenantPhoneMasked ? <p className="text-sm text-[#475569]">{open.tenantPhoneMasked}</p> : null}
                    </li>
                  ) : null}
                  {open.renters
                    .filter((renter) => renter.name !== open.tenantName)
                    .map((renter) => (
                      <li key={`${renter.name}-${renter.startDate}`}>
                        <p className="font-semibold text-[#0f172a]">
                          {renter.name}
                          {renter.current ? " · Living here" : ""}
                        </p>
                        {stayLabel(renter) ? <p className="text-sm text-[#475569]">{stayLabel(renter)}</p> : null}
                        {renter.phoneMasked ? <p className="text-sm text-[#475569]">{renter.phoneMasked}</p> : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-[#475569]">No tenant.</p>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {homes.length === 0 ? (
        <p className="mt-8 text-[#475569]">No home matches.</p>
      ) : (
        wings.map((wing) => (
          <section key={wing} className="mt-8">
            <h2 className="text-lg font-semibold text-[#0f172a]">Wing {wing}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {homes
                .filter((flat) => (flat.wing || "A") === wing)
                .map((flat) => {
                  const active = open?.flatNumber === flat.flatNumber;
                  const extra = peopleLine(flat);
                  return (
                    <li key={flat.flatNumber}>
                      <button
                        type="button"
                        onClick={() => setOpenNumber(active ? null : flat.flatNumber)}
                        className={`slab flex h-full w-full items-start gap-3 p-4 text-left ${
                          active ? "ring-2 ring-[#1e293b]" : ""
                        }`}
                      >
                        <ProfileAvatar name={flat.ownerName} photoUrl={flat.ownerPhotoUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-lg font-semibold text-[#0f172a]">{flat.flatNumber}</span>
                          <span className="block truncate font-medium text-[#0f172a]">{flat.ownerName}</span>
                          <span className="mt-1 block text-sm text-[#475569]">
                            Owner{flat.occupancyLabel === "Rented" ? " · Rented" : ""}
                            {flat.members.length ? ` · Family ${flat.members.length}` : ""}
                          </span>
                          {extra ? <span className="mt-1 block truncate text-sm text-[#475569]">{extra}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
