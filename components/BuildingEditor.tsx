"use client";

import { useMemo, useState } from "react";
import { adminSaveBuilder } from "@/app/actions/admin-manage";
import { Form } from "@/components/form-ui";
import { groupAmenities } from "@/lib/amenityGroups";

type Place = { label: string; distance: string };

export type BuildingEditorProject = {
  name: string
  developer: string
  tagline: string
  location: string
  address: string
  acres: number
  units: number
  floors: number
  rera: string
  igbc: string
  clubhouseSqft: number
  greeneryFacingPercent: number
  nearby: Place[]
  amenities: string[]
  launchDate: string
  emergencyContacts?: string
  gateRules?: string
  hostApproval?: boolean
};

const STATS = [
  ["units", "Homes", ""],
  ["acres", "Acres", ""],
  ["floors", "Floors", ""],
  ["clubhouseSqft", "Clubhouse", "sft"],
  ["greeneryFacingPercent", "Greenery", "%"],
] as const;

export function BuildingEditor({ project }: { readonly project: BuildingEditorProject }) {
  const [name, setName] = useState(project.name);
  const [tagline, setTagline] = useState(project.tagline);
  const [launchDate, setLaunchDate] = useState(project.launchDate);
  const [developer, setDeveloper] = useState(project.developer);
  const [location, setLocation] = useState(project.location);
  const [address, setAddress] = useState(project.address);
  const [rera, setRera] = useState(project.rera);
  const [stats, setStats] = useState({
    units: String(project.units),
    acres: String(project.acres),
    floors: String(project.floors),
    clubhouseSqft: String(project.clubhouseSqft),
    greeneryFacingPercent: String(project.greeneryFacingPercent),
  });
  const [places, setPlaces] = useState<Place[]>(
    project.nearby.length ? project.nearby.map((place) => ({ ...place })) : [{ label: "", distance: "" }],
  );
  const [amenities, setAmenities] = useState<string[]>([...project.amenities]);
  const [amenityDraft, setAmenityDraft] = useState("");

  const groups = useMemo(() => groupAmenities(amenities), [amenities]);
  const nearbyValue = places
    .filter((place) => place.label.trim())
    .map((place) => `${place.label.trim()} | ${place.distance.trim()}`)
    .join("\n");

  function addAmenity() {
    const next = amenityDraft.trim();
    if (!next || amenities.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    setAmenities((current) => [...current, next]);
    setAmenityDraft("");
  }

  return (
    <Form action={adminSaveBuilder} success="Building details saved." className="grid gap-4">
      <input type="hidden" name="igbc" value={project.igbc} />
      <input type="hidden" name="nearby" value={nearbyValue} />
      <input type="hidden" name="amenities" value={amenities.join("\n")} />

      <section className="slab grid gap-3 p-4">
        <h2 className="text-lg font-semibold text-[#0f172a]">Contacts and the gate</h2>
        <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
          Emergency contacts
          <textarea
            name="emergencyContacts"
            defaultValue={project.emergencyContacts || ""}
            className="field-control"
            placeholder="Security, plumber, lift"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#0f172a]">
          Gate rules
          <textarea
            name="gateRules"
            defaultValue={project.gateRules || ""}
            className="field-control"
            placeholder="When visitors may enter, and what the gate should check"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
          <input type="checkbox" name="hostApproval" defaultChecked={project.hostApproval !== false} />
          Ask the host to approve a visitor before entry
        </label>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] bg-[#0f172a] text-[#f8fafc] shadow-[0_18px_50px_rgba(20,36,28,0.18)]">
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,22rem)] lg:p-8">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-[#059669] uppercase">
              What members see
            </p>
            <input
              name="name"
              value={name}
              required
              data-label="Building name"
              data-field="name"
              onChange={(event) => setName(event.target.value)}
              aria-label="Building name"
              className="mt-2 w-full bg-transparent text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-none tracking-tight outline-none placeholder:text-[#6d7c74]"
              placeholder="Building name"
            />
            <input
              name="tagline"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              aria-label="Tagline"
              className="mt-3 w-full bg-transparent text-base text-[#f8fafc] outline-none placeholder:text-[#8a7a58] sm:text-lg"
              placeholder="One line about the building"
            />
            <textarea
              name="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              aria-label="Address"
              rows={2}
              className="mt-4 w-full resize-none bg-transparent text-sm leading-relaxed text-[#cbd5e1] outline-none placeholder:text-[#8a7a58]"
              placeholder="Street address"
            />
          </div>
          <div className="grid content-start gap-3">
            <label className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#059669] uppercase">
                Place
              </span>
              <input
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="mt-1 w-full bg-transparent text-base font-semibold outline-none"
              />
            </label>
            <label className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
              <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#059669] uppercase">
                Builder
              </span>
              <input
                name="developer"
                value={developer}
                onChange={(event) => setDeveloper(event.target.value)}
                className="mt-1 w-full bg-transparent text-base font-semibold outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#059669] uppercase">
                  Launch
                </span>
                <input
                  name="launchDate"
                  value={launchDate}
                  onChange={(event) => setLaunchDate(event.target.value)}
                  className="mt-1 w-full bg-transparent text-base font-semibold outline-none"
                  placeholder="2026"
                />
              </label>
              <label className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#059669] uppercase">
                  RERA
                </span>
                <input
                  name="rera"
                  value={rera}
                  onChange={(event) => setRera(event.target.value)}
                  className="mt-1 w-full bg-transparent font-mono text-sm font-semibold outline-none"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map(([key, label, suffix]) => (
          <label
            key={key}
            className="rounded-[1.35rem] bg-[#ffffff] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)]"
          >
            <span className="flex items-baseline gap-1">
              <input
                name={key}
                inputMode="decimal"
                value={stats[key]}
                onChange={(event) =>
                  setStats((current) => ({ ...current, [key]: event.target.value }))
                }
                className="w-full min-w-0 bg-transparent text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-none tracking-tight text-[#0f172a] outline-none"
              />
              {suffix ? (
                <span className="shrink-0 text-sm font-semibold text-[#b45309]">{suffix}</span>
              ) : null}
            </span>
            <span className="mt-2 block text-[0.68rem] font-semibold tracking-[0.14em] text-[#5a6e62] uppercase">
              {label}
            </span>
          </label>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="rounded-[1.35rem] bg-[#ffffff] p-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#0f172a]">Nearby</h2>
            <button
              type="button"
              onClick={() => setPlaces((current) => [...current, { label: "", distance: "" }])}
              className="min-h-10 rounded-full bg-[#1e293b] px-3 text-sm font-semibold text-[#f8fafc]"
            >
              Add place
            </button>
          </div>
          <ul className="mt-3 grid gap-2">
            {places.map((place, index) => (
              <li key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] gap-2">
                <input
                  value={place.label}
                  aria-label={`Place ${index + 1}`}
                  placeholder="Place"
                  onChange={(event) =>
                    setPlaces((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  className="min-h-12 rounded-2xl bg-[#f4efe4] px-3 text-base outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.12)]"
                />
                <input
                  value={place.distance}
                  aria-label={`Distance ${index + 1}`}
                  placeholder="3 km"
                  onChange={(event) =>
                    setPlaces((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, distance: event.target.value } : item,
                      ),
                    )
                  }
                  className="min-h-12 rounded-2xl bg-[#f4efe4] px-3 text-base outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.12)]"
                />
                <button
                  type="button"
                  aria-label={`Remove ${place.label || "place"}`}
                  onClick={() =>
                    setPlaces((current) =>
                      current.length === 1
                        ? [{ label: "", distance: "" }]
                        : current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="grid size-12 place-items-center rounded-2xl text-lg text-[#8a2f2f]"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.35rem] bg-[#ffffff] p-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)] sm:p-5">
          <h2 className="text-lg font-semibold text-[#0f172a]">Amenities</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={amenityDraft}
              onChange={(event) => setAmenityDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addAmenity();
                }
              }}
              placeholder="Add an amenity"
              aria-label="Add an amenity"
              className="min-h-12 min-w-0 flex-1 rounded-2xl bg-[#f4efe4] px-3 text-base outline-none focus:ring-4 focus:ring-[rgba(15,23,42,0.12)]"
            />
            <button
              type="button"
              onClick={addAmenity}
              className="min-h-12 rounded-full bg-[#059669] px-4 text-sm font-semibold text-[#0f172a]"
            >
              Add
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {groups.length === 0 ? (
              <p className="text-sm text-[#475569]">Nothing listed yet.</p>
            ) : (
              groups.map((group) => (
                <div key={group.title}>
                  <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#b45309] uppercase">
                    {group.title}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() =>
                            setAmenities((current) => current.filter((entry) => entry !== item))
                          }
                          className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#1e293b] px-3 text-sm font-semibold text-[#f8fafc]"
                        >
                          {item}
                          <span aria-hidden>×</span>
                          <span className="sr-only">Remove {item}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-full bg-[#0f172a]/95 px-2 py-2 pl-4 text-[#f8fafc] shadow-[0_12px_40px_rgba(20,36,28,0.28)] backdrop-blur">
        <p className="min-w-0 truncate text-sm">
          <span className="font-semibold">{name || "Untitled"}</span>
          <span className="text-[#059669]"> · {stats.units || "0"} homes</span>
        </p>
        <button type="submit" className="btn btn-gold shrink-0">
          Save building
        </button>
      </div>
    </Form>
  );
}
