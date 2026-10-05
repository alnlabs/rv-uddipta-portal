import Link from "next/link";
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

  return (
    <div className="page-gutter max-w-3xl py-5 md:py-8">
      <p className="text-sm font-semibold text-[#7a5c22]">Building</p>
      <h1 className="mt-2 font-semibold tracking-tight text-[#14241c] text-[clamp(2.4rem,6vw,4rem)] leading-[0.95]">
        {project.name}
      </h1>
      <p className="mt-3 max-w-xl text-lg text-[#3d5247]">
        About this apartment. Amenities, floor plan, and a view of the building.
      </p>
      {!signedIn ? (
        <Link
          href="/login"
          className="mt-6 flex min-h-16 w-full max-w-md items-center justify-center rounded-full bg-[#1b3a2f] px-6 text-xl font-semibold text-[#e8d5a3]"
        >
          Sign in
        </Link>
      ) : null}

      <section className="mt-8 border-t border-[rgba(27,58,47,0.1)] pt-6">
        <h2 className="text-2xl font-semibold text-[#14241c]">About the building</h2>
        <p className="mt-2 text-lg text-[#14241c]">{project.tagline}</p>
        {launch ? (
          <p className="mt-2 text-lg font-semibold text-[#14241c]">Launching {launch}</p>
        ) : null}
        <dl className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-[#3d5247]">Homes</dt>
            <dd className="text-3xl font-semibold text-[#14241c]">{project.units}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#3d5247]">Acres</dt>
            <dd className="text-3xl font-semibold text-[#14241c]">{project.acres}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#3d5247]">Floors</dt>
            <dd className="text-3xl font-semibold text-[#14241c]">{project.floors}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[#3d5247]">
          {project.developer}. {project.location}. {project.address}.
        </p>
        <p className="mt-1 text-sm text-[#3d5247]">RERA {project.rera}</p>
        <ul className="mt-3 space-y-1 text-sm text-[#3d5247]">
          {project.nearby.map((place) => (
            <li key={place.label}>
              {place.label}
              {place.distance ? ` · ${place.distance}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-[rgba(27,58,47,0.1)] pt-6">
        <h2 className="text-2xl font-semibold text-[#14241c]">Amenities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <article
              key={group.title}
              className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.1)]"
            >
              <h3 className="text-lg font-semibold text-[#14241c]">{group.title}</h3>
              <ul className="mt-2 space-y-1 text-base text-[#3d5247]">
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
          className="flex min-h-16 items-center justify-center rounded-2xl bg-[#1b3a2f] px-4 text-center text-lg font-semibold text-[#e8d5a3]"
        >
          Floors
        </Link>
        <Link
          href="/community?view=building"
          className="flex min-h-16 items-center justify-center rounded-2xl px-4 text-center text-lg font-semibold text-[#1b3a2f] ring-1 ring-[rgba(27,58,47,0.2)]"
        >
          The building
        </Link>
      </section>

      {showVisit ? (
        <section className="mt-10 border-t border-[rgba(27,58,47,0.1)] pt-6">
          <h2 className="text-2xl font-semibold text-[#14241c]">Book a visit</h2>
          <p className="mt-2 text-[#3d5247]">
            Tell us your name and phone. We will call you.
          </p>
          <VisitRequestForm />
        </section>
      ) : null}

      <p className="mt-12 text-sm text-[#3d5247]">Association — coming later.</p>
    </div>
  );
}
