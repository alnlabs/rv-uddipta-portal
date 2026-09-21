import Link from "next/link";
import { BuildingHighlights } from "@/components/BuildingHighlights";
import { HeroBand } from "@/components/HeroBand";
import { PublicFloorGuide } from "@/components/PublicFloorGuide";
import { BUILDING } from "@/lib/building";

export function PublicGate() {
  return (
    <>
      <HeroBand>
        <div className="w-[80%] py-14 text-center md:ml-[6%] md:w-[46%] md:py-28 md:text-left">
          <p className="mb-2 text-[0.7rem] font-semibold tracking-[0.16em] text-[#e8d5a3] uppercase md:text-xs">
            {BUILDING.location} · {BUILDING.units} homes · RERA {BUILDING.rera}
          </p>
          <h1 className="text-[2.35rem] leading-[0.95] font-semibold tracking-tight md:text-7xl">
            RV UDDIIPTA
          </h1>
          <p className="mx-auto mt-3 w-full text-[0.95rem] text-[#ebe4d4] md:mx-0 md:mt-4 md:text-base">
            {BUILDING.tagline} on {BUILDING.acres} acres. Brochure details are
            public. Owner information stays behind Google sign-in and admin
            approval.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-8 md:justify-start">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c9a45c] px-5 py-3 font-semibold text-[#14241c]"
            >
              Continue with Google
            </Link>
            <a
              href="#floors"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e8d5a3]/40 px-5 py-3 font-semibold text-[#f7f2e6]"
            >
              Browse floors
            </a>
          </div>
        </div>
      </HeroBand>

      <BuildingHighlights />
      <PublicFloorGuide />
    </>
  );
}
