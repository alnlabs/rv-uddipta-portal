"use client";

import { useMemo, useState } from "react";
import {
  facingLabel,
  possessionTone,
  typeLabel,
} from "@/lib/flatDisplay";

export type ListedFlat = {
  flatNumber: string
  wing: string
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  ownerName?: string
  statusLabel?: string | null
};

type Filter = "all" | "2BHK" | "3BHK";

export function FlatListing({
  floor,
  flats,
  showOwners = false,
}: {
  floor: number
  flats: ListedFlat[]
  showOwners?: boolean
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? flats : flats.filter((flat) => flat.type === filter)),
    [filter, flats],
  );

  const wings = useMemo(() => {
    const groups = ["A", "B"].map((wing) => ({
      wing,
      flats: visible.filter((flat) => (flat.wing || "A") === wing),
    }));
    return groups.filter((group) => group.flats.length > 0);
  }, [visible]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-[#14241c]">Floor {floor}</h3>
          <p className="text-sm text-[#3d5247]">
            {visible.length} of {flats.length} flats
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Filter by type">
          {(["all", "2BHK", "3BHK"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`min-h-10 rounded-full px-3 text-sm font-semibold ${
                filter === value
                  ? "bg-[#1b3a2f] text-[#e8d5a3]"
                  : "border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] text-[#3d5247]"
              }`}
            >
              {value === "all" ? "All" : typeLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {wings.length === 0 ? (
        <p className="rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] px-4 py-6 text-[#3d5247]">
          No flats on this floor match that filter.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {wings.map((group) => (
            <section key={group.wing} aria-label={`Wing ${group.wing}`}>
              <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                Wing {group.wing} · {group.flats.length}
              </p>
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {group.flats.map((flat) => (
                  <li
                    key={flat.flatNumber}
                    className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-3"
                  >
                    <strong className="block text-lg tracking-tight text-[#14241c]">
                      {flat.flatNumber}
                    </strong>
                    <p className="mt-1 text-sm font-semibold text-[#2f5a48]">
                      {typeLabel(flat.type)}
                      {flat.facing ? ` · ${facingLabel(flat.facing)}` : ""}
                    </p>
                    {flat.areaSqft ? (
                      <p className="text-sm text-[#3d5247]">
                        {flat.areaSqft.toLocaleString()} sft
                      </p>
                    ) : null}
                    {showOwners && flat.ownerName ? (
                      <p className="mt-2 truncate text-sm text-[#14241c]">{flat.ownerName}</p>
                    ) : null}
                    {showOwners && flat.statusLabel ? (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${possessionTone(flat.statusLabel)}`}
                      >
                        {flat.statusLabel}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
