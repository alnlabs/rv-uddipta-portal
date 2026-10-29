import Link from "next/link";
import { HeroBand } from "@/components/HeroBand";
import { VisitRequestForm } from "@/components/VisitRequestForm";
import { groupAmenities } from "@/lib/amenityGroups";
import type { ProjectInfo } from "@/lib/projectInfo";

export function BuildingGuide({
  project,
  showVisit,
  signedIn,
}: {
  readonly project: ProjectInfo
  readonly showVisit: boolean
  readonly signedIn: boolean
}) {
  const groups = groupAmenities(project.amenities);
  const launch = project.launchDate.trim();

  const intro = (
    <>
      <p className={signedIn ? "text-sm font-semibold text-[#b45309]" : "eyebrow-on-dark"}>Building</p>
      <h1
        className={`mt-2 font-semibold tracking-tight text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] ${
          signedIn ? "text-[#0f172a]" : "text-[#f8fafc]"
        }`}
      >
        {project.name}
      </h1>
      <p className={`mt-3 max-w-xl text-lg ${signedIn ? "text-[#475569]" : "text-[#e2e8f0]"}`}>
        About this apartment. Amenities, floor plan, and a view of the building.
      </p>
      {!signedIn ? (
        <Link
          href="/login"
          className="mt-6 flex min-h-16 w-full max-w-md items-center justify-center rounded-full bg-[#f8fafc] px-6 text-xl font-semibold text-[#0f172a]"
        >
          Sign in
        </Link>
      ) : null}
    </>
  );

  return (
    <div>
      {signedIn ? (
        <div className="page-gutter max-w-3xl py-5 md:py-8">{intro}</div>
      ) : (
        <HeroBand fill>
          <div className="page-gutter w-full max-w-3xl py-10 md:py-16">{intro}</div>
        </HeroBand>
      )}

      <div className="page-gutter max-w-3xl py-5 md:py-8">
      <section className="border-t border-[rgba(15,23,42,0.1)] pt-6">
        <h2 className="text-2xl font-semibold text-[#0f172a]">About the building</h2>
        <p className="mt-2 text-lg text-[#0f172a]">{project.tagline}</p>
        {launch ? (
          <p className="mt-2 text-lg font-semibold text-[#0f172a]">Launching {launch}</p>
        ) : null}
        <dl className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-[#475569]">Homes</dt>
            <dd className="text-3xl font-semibold text-[#0f172a]">{project.units}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#475569]">Acres</dt>
            <dd className="text-3xl font-semibold text-[#0f172a]">{project.acres}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#475569]">Floors</dt>
            <dd className="text-3xl font-semibold text-[#0f172a]">{project.floors}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[#475569]">
          {project.developer}. {project.location}. {project.address}.
        </p>
        <p className="mt-1 text-sm text-[#475569]">RERA {project.rera}</p>
        <ul className="mt-3 space-y-1 text-sm text-[#475569]">
          {project.nearby.map((place) => (
            <li key={place.label}>
              {place.label}
              {place.distance ? ` · ${place.distance}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-[rgba(15,23,42,0.1)] pt-6">
        <h2 className="text-2xl font-semibold text-[#0f172a]">Amenities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.title}
              className="rounded-2xl bg-[#ffffff] p-4 ring-1 ring-[rgba(15,23,42,0.1)]"
            >
              <h3 className="text-lg font-semibold text-[#0f172a]">{group.title}</h3>
              <ul className="mt-2 space-y-1 text-base text-[#475569]">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/community?view=floor"
          className="flex min-h-16 items-center justify-center rounded-2xl bg-[#1e293b] px-4 text-center text-lg font-semibold text-[#f8fafc]"
        >
          Floors
        </Link>
        <Link
          href="/community?view=building"
          className="flex min-h-16 items-center justify-center rounded-2xl px-4 text-center text-lg font-semibold text-[#1e293b] ring-1 ring-[rgba(15,23,42,0.2)]"
        >
          The building
        </Link>
      </section>

      {showVisit ? (
        <section className="mt-10 border-t border-[rgba(15,23,42,0.1)] pt-6">
          <h2 className="text-2xl font-semibold text-[#0f172a]">Book a visit</h2>
          <p className="mt-2 text-[#475569]">
            Tell us your name and phone. We will call you.
          </p>
          <VisitRequestForm />
        </section>
      ) : null}

      <p className="mt-12 text-sm text-[#475569]">Association — coming later.</p>
      </div>
    </div>
  );
}
