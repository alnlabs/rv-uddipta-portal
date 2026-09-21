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

export function MembersDirectory({
  flats,
  initialQuery = "",
}: {
  flats: MemberCard[]
  initialQuery?: string
}) {
  const [selected, setSelected] = useState<MemberCard | null>(null);
  const titleId = useId();

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
      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={initialQuery}
          placeholder="Search flat, owner, or member"
          className="min-h-11 flex-1 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] px-3 text-sm"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
        >
          Search
        </button>
      </form>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {flats.length === 0 ? (
          <li className="rounded-2xl bg-[#fffcf5] px-4 py-8 text-center text-sm text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)] sm:col-span-2 lg:col-span-3">
            No members match that search.
          </li>
        ) : (
          flats.map((flat) => (
            <li key={flat.flatNumber}>
              <button
                type="button"
                onClick={() => setSelected(flat)}
                className="group flex h-full w-full flex-col rounded-2xl bg-[#fffcf5] p-4 text-left ring-1 ring-[rgba(27,58,47,0.1)] transition-shadow hover:shadow-[0_10px_28px_rgba(20,36,28,0.1)] hover:ring-[rgba(27,58,47,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3a2f]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar
                      name={flat.ownerName}
                      photoUrl={flat.ownerPhotoUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
                        {flat.wing ? `Wing ${flat.wing}` : "Flat"} · Floor{" "}
                        {flat.floor}
                      </p>
                      <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-[#14241c]">
                        {flat.flatNumber}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${saleOccupancyTone(flat.occupancyLabel)}`}
                  >
                    {flat.occupancyLabel}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-[#14241c]">
                  {flat.ownerName}
                </p>
                {flat.phoneMasked ? (
                  <p className="text-xs tabular-nums text-[#3d5247]">
                    {flat.phoneMasked}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-[#3d5247]">
                  {typeLabel(flat.type)}
                  {flat.areaSqft
                    ? ` · ${flat.areaSqft.toLocaleString()} sft`
                    : ""}
                </p>

                {flat.members.length > 0 ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {flat.members.slice(0, 4).map((member) => (
                        <ProfileAvatar
                          key={`${flat.flatNumber}-${member.name}`}
                          name={member.name}
                          photoUrl={member.photoUrl}
                          size="sm"
                          tone="member"
                        />
                      ))}
                    </div>
                    <p className="line-clamp-2 text-xs leading-snug text-[#2f5a48]">
                      {flat.members.map((member) => member.name).join(", ")}
                    </p>
                  </div>
                ) : null}

                <span className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3] transition-colors group-hover:bg-[#14241c]">
                  Details
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

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
