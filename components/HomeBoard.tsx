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

const COMMUNITY_CHOICES: { id: CommunityView; href: string; label: string }[] = [
  { id: "guide", href: "/community", label: "About" },
  { id: "floor", href: "/community?view=floor", label: "Floors" },
  { id: "building", href: "/community?view=building", label: "The building" },
];

function CommunityChoices({ view }: { readonly view: CommunityView }) {
  return (
    <nav
      aria-label="Ways to see the building"
      className={`grid grid-cols-3 gap-2 ${
        view === "building" ? "px-2 pb-2 md:px-4" : "page-gutter max-w-6xl pt-4"
      }`}
    >
      {COMMUNITY_CHOICES.map((item) => {
        const active = view === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center rounded-2xl px-2 text-center text-base font-semibold sm:text-lg ${
              active
                ? "bg-[#1b3a2f] text-[#e8d5a3]"
                : "bg-[#fffcf5] text-[#14241c] shadow-[inset_0_0_0_1px_rgba(27,58,47,0.14)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
  const myFloor =
    data?.flats.find((flat) => flat.flatNumber === myFlatNumber)?.floor ?? null;
  const [activeFloor, setActiveFloor] = useState(() => {
    if (data?.floors.some((floor) => floor.floor === floorParam)) return floorParam;
    if (myFloor != null && data?.floors.some((floor) => floor.floor === myFloor)) {
      return myFloor;
    }
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
          ? signedIn
            ? "flex h-full min-h-0 flex-col pt-2 md:pt-3 md:pb-3"
            : "flex flex-col pt-2 pb-4"
          : ""
      }
    >
      <CommunityChoices view={view} />
      {view === "guide" ? (
        <BuildingGuide project={project} showVisit={showVisit} signedIn={signedIn} />
      ) : view === "building" ? (
        <div
          className={
            signedIn
              ? "flex min-h-0 flex-1 flex-col px-2 md:px-4"
              : "flex h-[calc(100svh-9rem)] min-h-[28rem] flex-col px-2 md:h-[calc(100svh-14rem)] md:px-4"
          }
        >
          <div className="min-h-0 flex-1">
            <Building3DLoader flats={modelFlats} myFlatNumber={myFlatNumber} />
          </div>
        </div>
      ) : (
        <section className="page-gutter max-w-6xl py-4 md:py-6">
          <h1 className="text-3xl font-semibold text-[#14241c]">Floors</h1>
          <p className="mt-2 text-lg text-[#3d5247]">Choose a floor, then tap a home.</p>
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
                    myFlatNumber={myFlatNumber}
                    soldFlats={
                      new Set(
                        selected.flats
                          .filter(
                            (flat) =>
                              flat.saleStatus === "sold" || Boolean(flat.ownerName.trim()),
                          )
                          .map((flat) => flat.flatNumber),
                      )
                    }
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
