"use client";

import { useEffect, useId, useState } from "react";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  facingLabel,
  listingChipTone,
  possessionTone,
  saleOccupancyTone,
  typeLabel,
} from "@/lib/flatDisplay";

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
};

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function periodLabel(renter: MemberRenter) {
  const start = formatDate(renter.startDate);
  const end = formatDate(renter.endDate);
  if (start && end) return `${start} → ${end}`;
  if (start && !end) return `${start} → present`;
  if (!start && end) return `until ${end}`;
  return null;
}

type Filter = "all" | "owners" | "tenants" | "family";

type DirectoryPerson = {
  id: string
  name: string
  photoUrl: string | null
  flatNumber: string
  wing: string
  role: "Owner" | "Tenant" | "Family"
  card: MemberCard
};

function peopleFromFlats(flats: MemberCard[]): DirectoryPerson[] {
  const people: DirectoryPerson[] = [];
  for (const flat of flats) {
    people.push({
      id: `owner-${flat.flatNumber}`,
      name: flat.ownerName,
      photoUrl: flat.ownerPhotoUrl,
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      role: "Owner",
      card: flat,
    });
    if (flat.tenantName) {
      people.push({
        id: `tenant-${flat.flatNumber}-${flat.tenantName}`,
        name: flat.tenantName,
        photoUrl: null,
        flatNumber: flat.flatNumber,
        wing: flat.wing,
        role: "Tenant",
        card: flat,
      });
    }
    for (const member of flat.members) {
      people.push({
        id: `family-${flat.flatNumber}-${member.name}`,
        name: member.name,
        photoUrl: member.photoUrl,
        flatNumber: flat.flatNumber,
        wing: flat.wing,
        role: "Family",
        card: flat,
      });
    }
  }
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

export function MembersDirectory({
  flats,
  initialQuery = "",
}: {
  flats: MemberCard[]
  initialQuery?: string
}) {
  const [selected, setSelected] = useState<MemberCard | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const titleId = useId();
  const people = peopleFromFlats(flats).filter((person) => {
    if (filter === "owners") return person.role === "Owner";
    if (filter === "tenants") return person.role === "Tenant";
    if (filter === "family") return person.role === "Family";
    return true;
  });
  const groups = new Map<string, DirectoryPerson[]>();
  for (const person of people) {
    const letter = (person.name[0] || "#").toUpperCase();
    const list = groups.get(letter) ?? [];
    list.push(person);
    groups.set(letter, list);
  }
  const letters = [...groups.keys()].sort();

  useEffect(() => {
    if (!selected) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  return (
    <>
      <form className="mt-6 flex gap-3 border-b border-[rgba(27,58,47,0.1)] pb-3">
        <input
          name="q"
          defaultValue={initialQuery}
          placeholder="Search name or flat"
          className="min-h-11 flex-1 border-0 bg-transparent px-0 text-base outline-none"
        />
        <button type="submit" className="text-sm font-semibold text-[#1b3a2f]">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {(
          [
            ["all", "All"],
            ["owners", "Owners"],
            ["tenants", "Tenants"],
            ["family", "Family"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={
              filter === id
                ? "border-b-2 border-[#14241c] font-semibold text-[#14241c]"
                : "text-[#3d5247]"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {people.length === 0 ? (
        <p className="mt-8 text-sm text-[#3d5247]">No residents match that search.</p>
      ) : (
        <div className="mt-6">
          {letters.map((letter) => (
            <section key={letter} className="mb-6">
              <h2 className="mb-1 text-sm font-semibold text-[#7a5c22]">{letter}</h2>
              <ul className="divide-y divide-[rgba(27,58,47,0.08)]">
                {(groups.get(letter) ?? []).map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(person.card)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <ProfileAvatar
                        name={person.name}
                        photoUrl={person.photoUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#14241c]">
                          {person.name}
                        </span>
                        <span className="block text-sm text-[#3d5247]">
                          {person.flatNumber}
                          {person.wing ? ` · Wing ${person.wing}` : ""} ·{" "}
                          {person.role}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1a14]/55 p-3 backdrop-blur-[2px] sm:items-center"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(90dvh,40rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-[#fffcf5] text-[#14241c] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-[rgba(27,58,47,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] bg-[#fffcf5]5 px-5 py-4 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar
                  name={selected.ownerName}
                  photoUrl={selected.ownerPhotoUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
                    Flat details
                  </p>
                  <h2
                    id={titleId}
                    className="mt-0.5 text-2xl font-semibold tracking-tight"
                  >
                    {selected.flatNumber}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setSelected(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-[#3d5247] hover:bg-[rgba(27,58,47,0.06)]"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                  Owner
                </p>
                <p className="mt-1 text-lg font-semibold">{selected.ownerName}</p>
                {selected.ownerEmail ? (
                  <a
                    href={`mailto:${selected.ownerEmail}`}
                    className="mt-0.5 block break-all text-sm text-[#2f5a48] underline-offset-2 hover:underline"
                  >
                    {selected.ownerEmail}
                  </a>
                ) : null}
                {selected.phoneMasked ? (
                  <p className="mt-0.5 text-sm tabular-nums text-[#3d5247]">
                    {selected.phoneMasked}
                  </p>
                ) : null}
              </div>

              {selected.members.length > 0 ? (
                <div>
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                    Household
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {selected.members.map((member) => (
                      <li
                        key={member.name}
                        className="flex items-center gap-3 rounded-xl bg-[rgba(27,58,47,0.05)] px-3 py-2"
                      >
                        <ProfileAvatar
                          name={member.name}
                          photoUrl={member.photoUrl}
                          size="sm"
                          tone="member"
                        />
                        <span className="text-sm font-medium">{member.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.renters.length > 0 ? (
                <div>
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#9a5b3c] uppercase">
                    Renters
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {selected.renters.map((renter) => {
                      const period = periodLabel(renter);
                      return (
                        <li
                          key={`${renter.name}-${renter.startDate}-${renter.endDate}`}
                          className="rounded-xl bg-[rgba(154,91,60,0.1)] px-3 py-2"
                        >
                          <p className="text-sm font-semibold">
                            {renter.name}
                            {renter.current ? (
                              <span className="ml-2 rounded-full bg-[rgba(154,91,60,0.2)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#6d3a22] uppercase">
                                Current
                              </span>
                            ) : null}
                          </p>
                          {period ? (
                            <p className="mt-0.5 text-xs text-[#3d5247]">
                              {period}
                            </p>
                          ) : null}
                          {renter.phoneMasked ? (
                            <p className="text-xs tabular-nums text-[#3d5247]">
                              {renter.phoneMasked}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : selected.tenantName ? (
                <div className="rounded-2xl bg-[rgba(154,91,60,0.1)] px-3.5 py-3">
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#9a5b3c] uppercase">
                    Tenant
                  </p>
                  <p className="mt-1 font-semibold">{selected.tenantName}</p>
                  {selected.tenantPhoneMasked ? (
                    <p className="text-sm tabular-nums text-[#3d5247]">
                      {selected.tenantPhoneMasked}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                  Journey dates
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  {(
                    [
                      ["Registration", selected.registrationDate],
                      ["Interior start", selected.interiorStartDate],
                      ["Interior done", selected.interiorDate],
                      ["Home ceremony", selected.ceremonyDate],
                      ["Move-in", selected.movingDate],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-[#3d5247]">{label}</dt>
                      <dd className="mt-0.5 font-semibold">
                        {formatDate(value) ?? "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${saleOccupancyTone(selected.occupancyLabel)}`}
                >
                  {selected.occupancyLabel}
                </span>
                {selected.openForRent ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listingChipTone("rent")}`}
                  >
                    Open for rent
                  </span>
                ) : null}
                {selected.openForResale ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listingChipTone("resale")}`}
                  >
                    Open for resale
                  </span>
                ) : null}
                {selected.statusLabel ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${possessionTone(selected.statusLabel)}`}
                  >
                    {selected.statusLabel}
                  </span>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-[rgba(27,58,47,0.1)] pt-4 text-sm">
                <div>
                  <dt className="text-xs text-[#3d5247]">Wing / floor</dt>
                  <dd className="mt-0.5 font-semibold">
                    {selected.wing || "—"} · {selected.floor}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#3d5247]">Type</dt>
                  <dd className="mt-0.5 font-semibold">
                    {typeLabel(selected.type)}
                  </dd>
                </div>
                {selected.facing ? (
                  <div>
                    <dt className="text-xs text-[#3d5247]">Facing</dt>
                    <dd className="mt-0.5 font-semibold">
                      {facingLabel(selected.facing)}
                    </dd>
                  </div>
                ) : null}
                {selected.areaSqft ? (
                  <div>
                    <dt className="text-xs text-[#3d5247]">Area</dt>
                    <dd className="mt-0.5 font-semibold">
                      {selected.areaSqft.toLocaleString()} sft
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="border-t border-[rgba(27,58,47,0.1)] px-5 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
