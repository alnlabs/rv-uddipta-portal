"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BuildingGuide } from "@/components/BuildingGuide";
import { Building3DLoader } from "@/components/Building3DLoader";
import type { ModelFlat } from "@/components/Building3DView";
import { FloorPlate2D } from "@/components/FlatPlan2D";
import {
  FlatTextFacts,
  FlatViewSheet,
  toPlanInput,
} from "@/components/FlatViews";
import { FloorTabs } from "@/components/FloorTabs";
import type { MemberSummary } from "@/lib/boardData";
import type { ProjectInfo } from "@/lib/projectInfo";
import type { BoardData, PublicFlat } from "@/lib/types";

type CommunityView = "guide" | "floor" | "building";

export function HomeBoard({
  data,
  error,
  myFlatNumber = null,
  modelFlats = [],
  project,
  showVisit = false,
  signedIn = true,
}: {
  data: BoardData | null
  error: string
  membersByFlatId?: Record<number, MemberSummary[]>
  myFlatNumber?: string | null
  showOwners?: boolean
  modelFlats?: ModelFlat[]
  project: ProjectInfo
  showVisit?: boolean
  signedIn?: boolean
}) {
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const view: CommunityView =
    rawView === "3d" || rawView === "building"
      ? "building"
      : rawView === "2d" || rawView === "floor"
        ? "floor"
        : "guide";
  const floorParam = Number(searchParams.get("floor"));
  const [activeFloor, setActiveFloor] = useState(() => {
    if (data?.floors.some((floor) => floor.floor === floorParam)) return floorParam;
    return data?.floors[0]?.floor ?? null;
  });
  const [openFlat, setOpenFlat] = useState<PublicFlat | null>(null);
  const selected = data?.floors.find((floor) => floor.floor === activeFloor);

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
        view === "building"
          ? "flex h-full min-h-0 flex-col px-2 pt-2 md:px-4 md:pt-3 md:pb-3"
          : view === "guide"
            ? ""
            : "page-gutter max-w-6xl py-5 md:py-8"
      }
    >
      {view === "guide" ? (
        <BuildingGuide project={project} showVisit={showVisit} signedIn={signedIn} />
      ) : view === "building" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Link href="/community" className="mb-2 text-sm font-semibold text-[#1b3a2f]">
            Back to Building
          </Link>
          <div className="min-h-0 flex-1">
            <Building3DLoader flats={modelFlats} myFlatNumber={myFlatNumber} />
          </div>
        </div>
      ) : (
        <section>
          <Link href="/community" className="text-sm font-semibold text-[#1b3a2f]">
            Back to Building
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-[#14241c]">Floor plan</h1>
          <p className="mt-2 text-[#3d5247]">Tap a flat to see its type and size.</p>
          {data ? (
            <>
              <div className="mb-4 mt-4">
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
            <p className="mt-4 rounded-2xl bg-[#fffcf5] px-4 py-3 text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]">
              {error || "Gathering floor data…"}
            </p>
          )}
        </section>
      )}

      {openFlat ? (
        <FlatViewSheet
          flat={toPlanInput(openFlat)}
          title={openFlat.flatNumber}
          eyebrow="Type and size"
          onClose={() => setOpenFlat(null)}
          text={<FlatTextFacts flat={toPlanInput(openFlat)} />}
        />
      ) : null}
    </div>
  );
}
