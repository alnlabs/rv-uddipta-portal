import { BUILDING } from "@/lib/building";
import { summarizeInventory } from "@/lib/inventory";

export function BuildingHighlights({
  showSnapshot = true,
}: {
  showSnapshot?: boolean
}) {
  const summary = summarizeInventory();

  return (
    <>
      {showSnapshot ? (
        <section
          aria-label="Project snapshot"
          className="page-gutter relative z-10 -mt-5 max-w-[1100px] rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5]/95 p-3 shadow-xl md:-mt-8 md:p-4"
        >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
          <li className="flex flex-col">
            <strong className="text-2xl text-[#1b3a2f]">{BUILDING.units}</strong>
            <span className="text-sm text-[#3d5247]">Homes</span>
          </li>
          <li className="flex flex-col">
            <strong className="text-2xl text-[#1b3a2f]">{BUILDING.acres}</strong>
            <span className="text-sm text-[#3d5247]">Acres gated</span>
          </li>
          <li className="flex flex-col">
            <strong className="text-2xl text-[#1b3a2f]">{BUILDING.floors}</strong>
            <span className="text-sm text-[#3d5247]">Residential floors</span>
          </li>
          <li className="flex flex-col">
            <strong className="text-2xl text-[#1b3a2f]">{summary.twoBhk}</strong>
            <span className="text-sm text-[#3d5247]">2BHK flats</span>
          </li>
          <li className="flex flex-col">
            <strong className="text-2xl text-[#1b3a2f]">{summary.threeBhk}</strong>
            <span className="text-sm text-[#3d5247]">3BHK flats</span>
          </li>
        </ul>
        </section>
      ) : null}

      <section
        id="project"
        className="page-gutter max-w-[1100px] py-8"
      >
        <div className="mb-4">
          <h2 className="text-3xl font-semibold tracking-tight text-[#14241c]">The project</h2>
          <p className="text-[#3d5247]">
            Public brochure details. Owner names, phones, and possession status
            stay private.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4">
            <h3 className="text-lg font-semibold text-[#14241c]">Address</h3>
            <p className="mt-2 text-[#3d5247]">{BUILDING.address}</p>
            <p className="mt-3 text-sm text-[#3d5247]">
              {BUILDING.developer} · RERA {BUILDING.rera} · IGBC {BUILDING.igbc}
            </p>
          </article>
          <article className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4">
            <h3 className="text-lg font-semibold text-[#14241c]">Homes</h3>
            <p className="mt-2 text-[#3d5247]">
              Wings A and B. 2BHK from {summary.twoMin.toLocaleString()}–
              {summary.twoMax.toLocaleString()} sft. 3BHK from{" "}
              {summary.threeMin.toLocaleString()}–{summary.threeMax.toLocaleString()} sft.
              {BUILDING.greeneryFacingPercent}% of apartments face greenery.
            </p>
            <p className="mt-3 text-sm text-[#3d5247]">
              {BUILDING.clubhouseSqft.toLocaleString()} sft clubhouse on floors 1–3.
              Typical floors 4–10 have 25 flats.
            </p>
          </article>
        </div>

        <h3 className="mt-6 text-lg font-semibold text-[#14241c]">Nearby</h3>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BUILDING.nearby.map((place) => (
            <li
              key={place.label}
              className="rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] px-4 py-3"
            >
              <strong className="block text-[#14241c]">{place.label}</strong>
              <span className="text-sm text-[#3d5247]">{place.distance}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-[#14241c]">Amenities</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {BUILDING.amenities.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] px-3 py-2 text-sm text-[#3d5247]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
