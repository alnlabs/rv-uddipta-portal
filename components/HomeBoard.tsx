"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Building3DLoader } from "@/components/Building3DLoader";
import type { ModelFlat } from "@/components/Building3DView";
import FlatGrid from "@/components/FlatGrid";
import { FloorPlate2D } from "@/components/FlatPlan2D";
import {
  FlatTextFacts,
  FlatViewSheet,
  toPlanInput,
} from "@/components/FlatViews";
import { FloorTabs } from "@/components/FloorTabs";
import { possessionLabel, saleOccupancyLabel } from "@/lib/flatDisplay";
import type { MemberSummary } from "@/lib/boardData";
import type { BoardData, PublicFlat } from "@/lib/types";

type CommunityView = "floors" | "2d" | "3d";

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
  const rawView = searchParams.get("view");
  const view: CommunityView =
    rawView === "3d" ? "3d" : rawView === "2d" ? "2d" : "floors";
  const floorParam = Number(searchParams.get("floor"));
  const [activeFloor, setActiveFloor] = useState(() => {
    if (data?.floors.some((floor) => floor.floor === floorParam)) return floorParam;
    return data?.floors[0]?.floor ?? null;
  });
  const [openFlat, setOpenFlat] = useState<PublicFlat | null>(null);
  const selected = data?.floors.find((floor) => floor.floor === activeFloor);

  function setView(next: CommunityView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "3d") params.set("view", "3d");
    else if (next === "2d") params.set("view", "2d");
    else params.delete("view");
    const query = params.toString();
    router.replace(query ? `/community?${query}` : "/community", {
      scroll: false,
    });
  }

  function openUnit(flatNumber: string) {
    const next =
      selected?.flats.find((flat) => flat.flatNumber === flatNumber) ??
      data?.flats.find((flat) => flat.flatNumber === flatNumber) ??
      null;
    setOpenFlat(next);
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
        className={`flex min-w-0 shrink-0 items-end justify-between gap-4 ${
          view === "3d"
            ? "mb-2 pb-2"
            : "border-b border-[rgba(27,58,47,0.1)] pb-4"
        }`}
      >
        <h1
          className={`font-semibold tracking-tight text-[#14241c] ${
            view === "3d" ? "text-xl" : "text-[clamp(2rem,5vw,3rem)] leading-[1.05]"
          }`}
        >
          Community
        </h1>
        <div
          className="inline-flex gap-px border-b border-[rgba(27,58,47,0.14)]"
          role="group"
          aria-label="Community view"
        >
          {(
            [
              ["floors", "Floors"],
              ["2d", "2D"],
              ["3d", "3D"],
            ] as const
          ).map(([id, label]) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`min-h-10 px-3 text-sm font-semibold ${
                  active
                    ? "border-b-2 border-[#14241c] text-[#14241c]"
                    : "text-[#3d5247]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      {view === "3d" ? (
        <div className="min-h-0 flex-1">
          <Building3DLoader flats={modelFlats} myFlatNumber={myFlatNumber} />
        </div>
      ) : view === "2d" ? (
        <section className="mt-5">
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
                <figure>
                  <figcaption className="mb-3 text-sm text-[#3d5247]">
                    Floor {selected.floor}
                  </figcaption>
                  <FloorPlate2D
                    floor={selected.floor}
                    highlight={openFlat?.flatNumber}
                    onSelectUnit={openUnit}
                  />
                </figure>
              ) : null}
            </>
          ) : (
            <p className="rounded-2xl bg-[#fffcf5] px-4 py-3 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
              {error || "Gathering floor data…"}
            </p>
          )}
        </section>
      ) : (
        <>
          <section id="floors" className="mt-6 scroll-mt-24">
            {data ? (
              <p className="mb-5 text-sm text-[#3d5247]">
                {showOwners
                  ? `${data.summary.sold} occupied · ${data.summary.unsold} available`
                  : `${data.total} homes`}
              </p>
            ) : null}
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

      {openFlat ? (
        <FlatViewSheet
          flat={toPlanInput(openFlat)}
          title={openFlat.flatNumber}
          eyebrow={
            showOwners
              ? saleOccupancyLabel(openFlat)
              : "Flat views"
          }
          onClose={() => setOpenFlat(null)}
          text={
            <div className="space-y-4">
              <FlatTextFacts flat={toPlanInput(openFlat)} />
              {showOwners ? (
                <div className="border-t border-[rgba(27,58,47,0.08)] pt-3 text-sm">
                  <p className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
                    {saleOccupancyLabel(openFlat)}
                  </p>
                  {openFlat.ownerName ? (
                    <p className="mt-1 font-semibold text-[#14241c]">
                      {openFlat.ownerName}
                    </p>
                  ) : null}
                  {openFlat.phoneMasked ? (
                    <p className="mt-0.5 text-xs tabular-nums text-[#3d5247]">
                      {openFlat.phoneMasked}
                    </p>
                  ) : null}
                  {possessionLabel(openFlat) ? (
                    <p className="mt-2 text-[#3d5247]">
                      {possessionLabel(openFlat)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          }
        />
      ) : null}
    </div>
  );
}
