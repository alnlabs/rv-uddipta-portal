"use client";

import dynamic from "next/dynamic";
import type { ModelFlat } from "@/components/Building3DView";

const Building3DView = dynamic(() => import("@/components/Building3DView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-0 place-items-center rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#1b3a2f] text-[#e8d5a3]">
      Loading 3D layout…
    </div>
  ),
});

export function Building3DLoader({
  flats,
  myFlatNumber,
}: {
  flats: ModelFlat[]
  myFlatNumber?: string | null
}) {
  return (
    <div className="h-full min-h-0">
      <Building3DView flats={flats} myFlatNumber={myFlatNumber} />
    </div>
  );
}
