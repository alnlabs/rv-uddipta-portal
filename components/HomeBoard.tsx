"use client";

import { useState } from "react";
import { BuildingHighlights } from "@/components/BuildingHighlights";
import FlatGrid from "@/components/FlatGrid";
import { FloorTabs } from "@/components/FloorTabs";
import { HeroBand } from "@/components/HeroBand";
import { BUILDING } from "@/lib/building";
import type { BoardData } from "@/lib/types";

export function HomeBoard({ data, error }: { data: BoardData | null; error: string }) {
  const [activeFloor, setActiveFloor] = useState(data?.floors[0]?.floor ?? null);
  const selected = data?.floors.find((floor) => floor.floor === activeFloor);

  return (
    <>
      <HeroBand>
        <div className="w-[80%] py-10 text-center md:ml-[6%] md:w-[46%] md:py-28 md:text-left">
          <p className="mb-2 text-[0.7rem] font-semibold tracking-[0.16em] text-[#e8d5a3] uppercase md:mb-3 md:text-xs">
            {BUILDING.location} · {BUILDING.units} homes · RERA {BUILDING.rera}
          </p>
          <h1 className="text-[2.35rem] leading-[0.95] font-semibold tracking-tight md:text-7xl">
            RV UDDIIPTA
          </h1>
          <p className="mx-auto mt-3 w-full text-[0.95rem] text-[#f7f2e6]/85 md:mx-0 md:mt-4 md:text-base">
            {BUILDING.tagline} on {BUILDING.acres} acres. Possession progress
            below is for approved owners only.
          </p>
          <div className="mt-6 flex justify-center md:mt-8 md:justify-start">
            <a
              href="#floors"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c9a45c] px-5 py-3 font-semibold text-[#14241c]"
            >
              Browse floors
            </a>
          </div>
        </div>
      </HeroBand>

      <section
        aria-label="Possession snapshot"
        className="relative z-10 mx-auto -mt-5 w-[calc(100%-1.25rem)] rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5]/95 p-3 shadow-xl md:-mt-8 md:w-[min(1100px,calc(100%-2rem))] md:p-4"
      >
        {data ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
            <li className="flex flex-col">
              <strong className="text-2xl text-[#1b3a2f]">{data.total}</strong>
              <span className="text-sm text-[#3d5247]">Brochure flats</span>
            </li>
            <li className="flex flex-col">
              <strong className="text-2xl text-[#1b3a2f]">{data.summary.registrationCompleted}</strong>
              <span className="text-sm text-[#3d5247]">Registered</span>
            </li>
            <li className="flex flex-col">
              <strong className="text-2xl text-[#1b3a2f]">{data.summary.interiorCompleted}</strong>
              <span className="text-sm text-[#3d5247]">Interior done</span>
            </li>
            <li className="flex flex-col">
              <strong className="text-2xl text-[#1b3a2f]">{data.summary.ceremonyCompleted}</strong>
              <span className="text-sm text-[#3d5247]">Ceremony done</span>
            </li>
            <li className="flex flex-col">
              <strong className="text-2xl text-[#1b3a2f]">{data.summary.movedIn}</strong>
              <span className="text-sm text-[#3d5247]">Moved in</span>
            </li>
          </ul>
        ) : (
          <p className="text-[#3d5247]">{error || "Gathering floor data…"}</p>
        )}
      </section>

      <BuildingHighlights showSnapshot={false} />

      <section id="floors" className="mx-auto w-[calc(100%-1.25rem)] scroll-mt-24 py-8 md:w-[min(1100px,calc(100%-2rem))] md:scroll-mt-28 md:py-14">
        <div className="mb-4">
          <h2 className="text-3xl font-semibold tracking-tight text-[#14241c]">Floor-wise flats</h2>
          <p className="text-[#3d5247]">
            Pick a floor and wing. A coloured tag is the latest possession step.
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
            {selected ? <FlatGrid floor={selected.floor} flats={selected.flats} /> : null}
          </>
        ) : null}
      </section>
    </>
  );
}
