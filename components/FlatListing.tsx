"use client";

import { useMemo, useState } from "react";
import {
  facingLabel,
  listingChipTone,
  possessionTone,
  typeLabel,
} from "@/lib/flatDisplay";
import type { SaleStatus } from "@/lib/types";

export type ListedFlat = {
  flatNumber: string
  wing: string
  unit: number
  type: string
  facing: string
  areaSqft: number | null
  saleStatus?: SaleStatus
  occupancyLabel?: string | null
  openForRent?: boolean
  openForResale?: boolean
  ownerName?: string
  ownerEmail?: string
  phoneMasked?: string
  tenantName?: string
  tenantPhoneMasked?: string
  statusLabel?: string | null
  memberNames?: string[]
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-[#14241c]">
            Floor {floor}
          </h3>
          <p className="text-sm text-[#3d5247]">
            {visible.length} of {flats.length} flats
          </p>
        </div>
        <div
          className="inline-flex gap-1 rounded-full border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]/90 p-1"
          role="group"
          aria-label="Filter by type"
        >
          {(["all", "2BHK", "3BHK"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`min-h-9 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                filter === value
                  ? "bg-[#1b3a2f] text-[#e8d5a3]"
                  : "text-[#3d5247] hover:bg-[rgba(27,58,47,0.06)]"
              }`}
            >
              {value === "all" ? "All" : typeLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {wings.length === 0 ? (
        <p className="rounded-2xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]/95 px-4 py-8 text-center text-[#3d5247]">
          No flats on this floor match that filter.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {wings.map((group) => (
            <section key={group.wing} aria-label={`Wing ${group.wing}`}>
              <div className="mb-3 flex items-center gap-3">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#3d5247] uppercase">
                  Wing {group.wing}
                </p>
                <span className="h-px flex-1 bg-[rgba(27,58,47,0.12)]" aria-hidden />
                <span className="text-xs font-semibold text-[#3d5247]">
                  {group.flats.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {group.flats.map((flat) => {
                  const sold = Boolean(
                    showOwners &&
                      (flat.saleStatus === "sold" || flat.ownerName),
                  );
                  const rented = sold && flat.occupancyLabel === "Rented";
                  return (
                    <li
                      key={flat.flatNumber}
                      className={`min-w-0 rounded-2xl border p-3.5 transition-shadow ${
                        sold
                          ? rented
                            ? "border-[rgba(154,91,60,0.45)] bg-[#f7efe8] shadow-[inset_3px_0_0_#9a5b3c]"
                            : "border-[rgba(47,120,80,0.4)] bg-[#eef6f1] shadow-[inset_3px_0_0_#2f7a55]"
                          : "border-[rgba(27,58,47,0.12)] bg-[#fffcf5]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-lg tracking-tight text-[#14241c]">
                          {flat.flatNumber}
                        </strong>
                        {showOwners ? (
                          <span
                            className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                              sold
                                ? rented
                                  ? "bg-[#9a5b3c] text-[#fffcf5]"
                                  : "bg-[#2f7a55] text-[#fffcf5]"
                                : "bg-[#ebe6dc] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]"
                            }`}
                          >
                            {flat.occupancyLabel || "Unsold"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#2f5a48]">
                        {typeLabel(flat.type)}
                        {flat.facing ? ` · ${facingLabel(flat.facing)}` : ""}
                      </p>
                      {flat.areaSqft ? (
                        <p className="text-sm text-[#3d5247]">
                          {flat.areaSqft.toLocaleString()} sft
                        </p>
                      ) : null}
                      {sold ? (
                        <div className="mt-3 border-t border-[rgba(27,58,47,0.08)] pt-2.5">
                          <p className="truncate text-sm font-medium text-[#14241c]">
                            {flat.ownerName || "Owner"}
                          </p>
                          {flat.ownerEmail ? (
                            <p className="truncate text-xs text-[#3d5247]">
                              {flat.ownerEmail}
                            </p>
                          ) : null}
                          {flat.phoneMasked ? (
                            <p className="mt-0.5 text-xs tabular-nums text-[#3d5247]">
                              {flat.phoneMasked}
                            </p>
                          ) : null}
                          {flat.memberNames && flat.memberNames.length > 0 ? (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#3d5247]">
                              with {flat.memberNames.join(", ")}
                            </p>
                          ) : null}
                          {flat.tenantName ? (
                            <div className="mt-2 rounded-xl bg-white/70 px-2 py-1.5">
                              <p className="text-[10px] font-semibold tracking-[0.12em] text-[#9a5b3c] uppercase">
                                Tenant
                              </p>
                              <p className="truncate text-sm font-medium text-[#14241c]">
                                {flat.tenantName}
                              </p>
                              {flat.tenantPhoneMasked ? (
                                <p className="text-xs tabular-nums text-[#3d5247]">
                                  {flat.tenantPhoneMasked}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {flat.openForRent ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${listingChipTone("rent")}`}
                              >
                                Open for rent
                              </span>
                            ) : null}
                            {flat.openForResale ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${listingChipTone("resale")}`}
                              >
                                Open for resale
                              </span>
                            ) : null}
                            {flat.statusLabel ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${possessionTone(flat.statusLabel)}`}
                              >
                                {flat.statusLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : showOwners ? (
                        <p className="mt-3 border-t border-[rgba(27,58,47,0.08)] pt-2.5 text-xs font-semibold text-[#3d5247]">
                          Unsold
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
