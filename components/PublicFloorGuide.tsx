"use client";

import { useState } from "react";
import { FlatListing } from "@/components/FlatListing";
import { FloorTabs } from "@/components/FloorTabs";
import { groupInventoryByFloor } from "@/lib/inventory";

export function PublicFloorGuide() {
  const floors = groupInventoryByFloor();
  const [activeFloor, setActiveFloor] = useState(floors[0]?.floor ?? 1);
  const selected = floors.find((floor) => floor.floor === activeFloor);

  return (
    <section
      id="floors"
      className="page-gutter max-w-[1100px] scroll-mt-24 pb-8 md:scroll-mt-28 md:pb-14"
    >
      <div className="mb-4">
        <h2 className="text-3xl font-semibold tracking-tight text-[#14241c]">
          Floor-wise flats
        </h2>
        <p className="text-[#3d5247]">
          Pick a floor, then a wing. Sign in to see owners and possession.
        </p>
      </div>

      <div className="mb-4">
        <FloorTabs
          floors={floors.map((floor) => floor.floor)}
          activeFloor={activeFloor}
          onChange={setActiveFloor}
        />
      </div>

      {selected ? (
        <FlatListing
          floor={selected.floor}
          flats={selected.flats.map((flat) => ({
            flatNumber: flat.flatNumber,
            wing: flat.wing,
            unit: flat.unit,
            type: flat.type,
            facing: flat.facing,
            areaSqft: flat.areaSqft,
          }))}
        />
      ) : null}
    </section>
  );
}
