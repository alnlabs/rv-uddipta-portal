"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Building3DLoader } from "@/components/Building3DLoader";
import type { ModelFlat } from "@/components/Building3DView";
import FlatGrid from "@/components/FlatGrid";
import { FloorTabs } from "@/components/FloorTabs";
import type { MemberSummary } from "@/lib/boardData";
import type { BoardData } from "@/lib/types";

type CommunityView = "floors" | "3d";

export function HomeBoard({
  data,
  error,
  membersByFlatId = {},
  myFlatNumber = null,
  showOwners = true,
  modelFlats = [],
  includeOwners = true,
}: {
  data: BoardData | null
  error: string
  membersByFlatId?: Record<number, MemberSummary[]>
  myFlatNumber?: string | null
  showOwners?: boolean
  modelFlats?: ModelFlat[]
  includeOwners?: boolean
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view: CommunityView =
    searchParams.get("view") === "3d" ? "3d" : "floors";
  const [activeFloor, setActiveFloor] = useState(data?.floors[0]?.floor ?? null);
  const selected = data?.floors.find((floor) => floor.floor === activeFloor);
  const myFlat = myFlatNumber
    ? data?.flats.find((flat) => flat.flatNumber === myFlatNumber)
    : null;

  function setView(next: CommunityView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "3d") params.set("view", "3d");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `/community?${query}` : "/community", {
      scroll: false,
    });
  }

  return (
    <div
      className={
        view === "3d"
          ? "flex h-full min-h-0 flex-col px-2 pt-2 md:px-4 md:pt-3 md:pb-3"
          : "page-gutter max-w-6xl py-5 md:py-8"
      }
    >
      <header
        className={`flex min-w-0 shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between ${
          view === "3d"
            ? "mb-2 border-b border-[rgba(27,58,47,0.1)] pb-3 md:mb-3"
            : "border-b border-[rgba(27,58,47,0.1)] pb-5"
        }`}
      >
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            Live community data
          </p>
          <h1
            className={`mt-1 font-semibold tracking-tight text-[#14241c] ${
              view === "3d" ? "text-xl md:text-2xl" : "text-3xl md:text-4xl"
            }`}
          >
            Community
          </h1>
          <p
            className={`mt-2 max-w-xl text-[#3d5247] ${
              view === "3d" ? "text-sm" : "text-sm md:text-base"
            }`}
          >
            {view === "3d"
              ? includeOwners
                ? "Green = sold. Grey = unsold. Open a flat for owner and listing details."
                : "Public view — sold vs unsold. Owner contacts stay private."
              : showOwners
                ? "Sold flats show owner stay or rented. Tenant details are community contact info only."
                : "Public brochure view — sold vs unsold and open listings. Owner contacts stay private."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full bg-[rgba(27,58,47,0.08)] p-1"
            role="group"
            aria-label="Community view"
          >
            {(
              [
                ["floors", "Floors"],
                ["3d", "3D"],
              ] as const
            ).map(([id, label]) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : "text-[#3d5247] hover:text-[#14241c]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {myFlatNumber ? (
            <Link
              href="/update"
              className="inline-flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-[#14241c] px-4 py-3 text-[#f7f2e6] md:min-w-[14rem]"
            >
              <span>
                <span className="block text-[0.65rem] font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
                  Your flat
                </span>
                <span className="text-lg font-semibold tracking-tight text-[#f7f2e6]">
                  {myFlatNumber}
                </span>
                {myFlat?.ownerName ? (
                  <span className="mt-0.5 block text-xs text-[#e8d5a3]">
                    {myFlat.ownerName}
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-semibold text-[#c9a45c]">
                Manage →
              </span>
            </Link>
          ) : null}
        </div>
      </header>

      {view === "3d" ? (
        <div className="min-h-0 flex-1">
          <Building3DLoader flats={modelFlats} myFlatNumber={myFlatNumber} />
        </div>
      ) : (
        <>
          <section aria-label="Possession snapshot" className="mt-5">
            {data ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
                {[
                  { value: data.total, label: "Flats tracked" },
                  { value: data.summary.sold, label: "Sold" },
                  { value: data.summary.unsold, label: "Unsold" },
                  ...(showOwners
                    ? [
                        { value: data.summary.ownerStay, label: "Owner stay" },
                        { value: data.summary.rented, label: "Rented" },
                      ]
                    : []),
                  { value: data.summary.openForRent, label: "Open for rent" },
                  {
                    value: data.summary.openForResale,
                    label: "Open for resale",
                  },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="rounded-2xl bg-[#fffcf5] px-3 py-3 ring-1 ring-[rgba(27,58,47,0.12)]"
                  >
                    <strong className="block text-2xl text-[#1b3a2f]">
                      {item.value}
                    </strong>
                    <span className="text-sm text-[#3d5247]">{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-[#fffcf5] px-4 py-3 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
                {error || "Gathering floor data…"}
              </p>
            )}
          </section>

          <section id="floors" className="mt-8 scroll-mt-24 md:mt-10">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold tracking-tight text-[#14241c]">
                Floors
              </h2>
              <p className="text-sm text-[#3d5247]">
                Pick a floor and wing. Coloured tags show the latest possession
                step.
              </p>
            </div>
            {error ? (
              <p className="mb-4 rounded-xl border border-[rgba(138,47,47,0.18)] bg-[rgba(138,47,47,0.08)] px-4 py-3 text-[#8a2f2f]">
                {error}
              </p>
            ) : null}
            {data ? (
              <>
                <div className="mb-4">
                  <FloorTabs
                    floors={data.floors.map((floor) => floor.floor)}
                    activeFloor={activeFloor}
                    onChange={setActiveFloor}
                  />
                </div>
                {selected ? (
                  <FlatGrid
                    floor={selected.floor}
                    flats={selected.flats}
                    membersByFlatId={membersByFlatId}
                    showOwners={showOwners}
                  />
                ) : null}
              </>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
