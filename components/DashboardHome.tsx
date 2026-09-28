"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FlatPlan2D } from "@/components/FlatPlan2D";
import { PageShell, SectionHead, Segmented, TextLink } from "@/components/chrome";
import { JourneyDetail } from "@/components/JourneyDetail";
import ProfileAvatar from "@/components/ProfileAvatar";
import UpdateForm from "@/components/UpdateForm";
import {
  apartmentLayout,
  heroMeta,
  interiorLinks,
  layoutGroups,
  occupancyCopy,
} from "@/lib/apartmentLayout";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { summarize } from "@/lib/flats";
import { greeting, journeySteps } from "@/lib/homeDisplay";
import { relationLabel } from "@/lib/status";
import type { FlatMember, FlatRenter, OwnedFlat, PublicFlat } from "@/lib/types";

const FlatUnit3D = dynamic(() => import("@/components/FlatUnit3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[22rem] place-items-center bg-[#1b3a2f] text-sm font-semibold text-[#e8d5a3] md:h-[26rem]">
      Loading 3D unit…
    </div>
  ),
});

export type DashboardActivity = {
  id: number
  title: string
  body: string | null
  kind: string
  createdAt: string
  flatNumber: string | null
};

type PlanMode = "2d" | "3d";
type HomeSection = "hub" | "stay" | "documents";

function sectionFromHash(): HomeSection {
  if (typeof window === "undefined") return "hub";
  const hash = window.location.hash.replace("#", "");
  if (hash === "stay" || hash === "documents") return hash;
  return "hub";
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function planInput(flat: PublicFlat) {
  return {
    flatNumber: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    areaSqft: flat.areaSqft,
  };
}

function Mark({ mark }: { readonly mark: "done" | "active" | "upcoming" }) {
  if (mark === "done") {
    return (
      <span className="grid size-6 place-items-center rounded-full bg-[#1b3a2f] text-[11px] font-bold text-[#e8d5a3]">
        ✓
      </span>
    );
  }
  if (mark === "active") {
    return (
      <span className="grid size-6 place-items-center rounded-full ring-2 ring-[#c9a45c]">
        <span className="size-2 rounded-full bg-[#c9a45c]" />
      </span>
    );
  }
  return <span className="grid size-6 place-items-center rounded-full ring-1 ring-[rgba(27,58,47,0.22)]" />;
}

export function DashboardHome({
  flats,
  includeOwners,
  myFlatNumber,
  greetingName = null,
  recentActivity = [],
  members = [],
  renters = [],
  ownedFlat = null,
  ownerPhoneMasked = "",
}: {
  flats: PublicFlat[]
  includeOwners: boolean
  myFlatNumber?: string | null
  greetingName?: string | null
  recentActivity?: DashboardActivity[]
  members?: FlatMember[]
  renters?: FlatRenter[]
  ownedFlat?: OwnedFlat | null
  ownerPhoneMasked?: string
}) {
  const [mode, setMode] = useState<PlanMode>("2d");
  const [section, setSection] = useState<HomeSection>("hub");
  const [journeyOpen, setJourneyOpen] = useState(false);

  useEffect(() => {
    function apply() {
      const hash = window.location.hash.replace("#", "");
      setSection(sectionFromHash());
      setJourneyOpen(hash === "journey");
      if (hash === "2d" || hash === "3d") setMode(hash);
    }
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (section !== "hub") return;
    const hash = window.location.hash.replace("#", "");
    const scrollId =
      hash === "3d" || hash === "2d"
        ? "your-apartment"
        : hash === "interior" || hash === "your-apartment" || hash === "activity"
          ? hash
          : null;
    if (!scrollId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(scrollId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [section]);

  function openSection(next: HomeSection) {
    setJourneyOpen(false);
    setSection(next);
    window.history.replaceState(null, "", next === "hub" ? "/" : `/#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openJourney() {
    setJourneyOpen(true);
    window.history.replaceState(null, "", "/#journey");
  }

  function closeJourney() {
    setJourneyOpen(false);
    if (window.location.hash === "#journey") {
      window.history.replaceState(null, "", "/");
    }
  }
  const summary = summarize(flats);
  const myFlat =
    ownedFlat ??
    (myFlatNumber
      ? flats.find((flat) => flat.flatNumber === myFlatNumber) ?? null
      : null);
  const hello = greeting(greetingName || myFlat?.ownerName);

  if (ownedFlat && section === "stay") {
    return (
      <UpdateForm
        key={section}
        ownerPhoneMasked={ownerPhoneMasked}
        initialFlat={ownedFlat}
        initialMembers={members}
        initialRenters={renters}
        initialPanel={section}
        onClose={() => openSection("hub")}
      />
    );
  }

  if (section === "documents" && myFlat) {
    return (
      <PageShell>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
            Documents & records
          </h1>
          <button
            type="button"
            onClick={() => openSection("hub")}
            aria-label={`Close and return to ${myFlat.flatNumber}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-[#14241c] ring-1 ring-[rgba(27,58,47,0.16)] hover:bg-[rgba(27,58,47,0.05)]"
          >
            ×
          </button>
        </div>
        <p className="mt-4 max-w-xl text-[#3d5247]">
          No apartment files are stored here yet. Floor plans live in Your
          apartment. Registration papers, allotment records and interior
          documents will appear here when they are added.
        </p>
      </PageShell>
    );
  }

  if (!myFlat) {
    return (
      <PageShell wide>
        <p className="text-sm text-[#7a5c22]">{hello}</p>
        <h1 className="mt-2 font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
          My home
        </h1>
        <p className="mt-3 max-w-xl text-[#3d5247]">
          {includeOwners
            ? "Explore the community while your flat is linked."
            : "Brochure details only until your flat is approved."}
        </p>
        {!includeOwners ? (
          <p className="mt-4">
            <TextLink href="/register">Link your flat →</TextLink>
          </p>
        ) : null}
      </PageShell>
    );
  }

  const stay = occupancyCopy(myFlat);
  const steps = journeySteps(myFlat);
  const journeyComplete = steps.every((step) => step.mark === "done");
  const layout = apartmentLayout(myFlat);
  const groups = layoutGroups(layout);
  const drawing = layout.rooms.find((room) => /drawing/i.test(room.label));
  const dining = layout.rooms.find((room) => /dining/i.test(room.label));
  const interior = steps.find((step) => step.key === "interior");
  const links = interiorLinks(myFlat);
  const homeActivity = recentActivity.filter(
    (item) => !item.flatNumber || item.flatNumber === myFlat.flatNumber,
  );

  function showPlan(next: PlanMode) {
    setMode(next);
    document.getElementById("your-apartment")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <PageShell wide>
      <header className="flex flex-col gap-5 border-b border-[rgba(27,58,47,0.1)] pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-[#7a5c22]">{hello}</p>
          <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-[#7a5c22] uppercase">
            My home
          </p>
          <h1 className="mt-1 font-semibold tracking-tight text-[#14241c] text-[clamp(2.75rem,8vw,4.5rem)] leading-[0.92]">
            {myFlat.flatNumber}
          </h1>
          {myFlat.ownerName ? (
            <p className="mt-3 text-lg text-[#14241c]">{myFlat.ownerName}</p>
          ) : null}
          <p className="mt-1 text-sm text-[#3d5247] md:text-base">{heroMeta(myFlat)}</p>
          <p className="mt-1 text-sm text-[#3d5247]">{stay}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showPlan("2d")}
            className="inline-flex min-h-11 items-center rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
          >
            View 2D Plan
          </button>
          <button
            type="button"
            onClick={() => showPlan("3d")}
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#1b3a2f] ring-1 ring-[rgba(27,58,47,0.18)]"
          >
            View 3D
          </button>
        </div>
      </header>

      <section className="mt-6 border-b border-[rgba(27,58,47,0.1)] pb-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Home at a glance
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              [
                myFlat.areaSqft
                  ? `${myFlat.areaSqft.toLocaleString("en-IN")} sq ft`
                  : "—",
                "Area",
              ],
              [typeLabel(myFlat.type), "Configuration"],
              [`Floor ${myFlat.floor}`, `Wing ${myFlat.wing}`],
              [myFlat.facing ? facingLabel(myFlat.facing) : "—", "Facing"],
              [stay, "Occupancy"],
              [interior?.status ?? "—", "Interior"],
            ] as const
          ).map(([value, label]) => (
            <div key={label}>
              <dd className="text-lg font-semibold tracking-tight text-[#14241c]">
                {value}
              </dd>
              <dt className="mt-0.5 text-xs text-[#3d5247]">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section id="your-apartment" className="mt-8 scroll-mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#14241c] md:text-2xl">
              Your apartment
            </h2>
            <p className="mt-1 text-sm text-[#3d5247]">
              Explore the layout of {myFlat.flatNumber}
            </p>
          </div>
          <Segmented
            label={`${myFlat.flatNumber} view`}
            value={mode}
            onChange={setMode}
            options={[
              { id: "2d", label: "2D" },
              { id: "3d", label: "3D" },
            ]}
          />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.6fr)]">
          <div className="overflow-hidden rounded-[1.5rem] bg-[#ebe6dc] ring-1 ring-[rgba(27,58,47,0.1)]">
            {mode === "2d" ? (
              <div className="mx-auto max-w-3xl p-2 md:p-3">
                <FlatPlan2D
                  compact
                  homeLabel={myFlat.flatNumber}
                  flat={planInput(myFlat)}
                />
              </div>
            ) : (
              <FlatUnit3D flat={planInput(myFlat)} />
            )}
          </div>
          <aside className="lg:pt-1">
            <h3 className="text-sm font-semibold text-[#14241c]">Apartment facts</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {(
                [
                  ["Configuration", typeLabel(myFlat.type)],
                  [
                    "Area",
                    myFlat.areaSqft
                      ? `${myFlat.areaSqft.toLocaleString("en-IN")} sq ft`
                      : "—",
                  ],
                  ["Floor", String(myFlat.floor)],
                  ["Wing", myFlat.wing || "—"],
                  ["Facing", myFlat.facing ? facingLabel(myFlat.facing) : "—"],
                  ["Bedrooms", String(groups.bedrooms.length || "—")],
                  ["Bathrooms", String(groups.toilets.length || "—")],
                  ["Balconies", String(groups.balconies.length || "—")],
                  [
                    "Kitchen",
                    groups.kitchen?.dim ?? (groups.kitchen ? "In plan" : "—"),
                  ],
                  ["Drawing", drawing?.dim ?? (drawing ? "In plan" : "—")],
                  ["Dining", dining?.dim ?? (dining ? "In plan" : "—")],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] pb-2"
                >
                  <dt className="text-[#3d5247]">{label}</dt>
                  <dd className="font-semibold text-[#14241c]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => showPlan("2d")}
                className="text-left text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
              >
                View full 2D plan
              </button>
              <button
                type="button"
                onClick={() => showPlan("3d")}
                className="text-left text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
              >
                Explore in 3D
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <SectionHead
          title={journeyComplete ? "Home journey" : "Your home journey"}
          aside={
            journeyComplete ? null : (
              <button
                type="button"
                onClick={openJourney}
                className="text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
              >
                View journey →
              </button>
            )
          }
        />
        {journeyComplete ? (
          <div className="mt-3">
            <p className="font-semibold text-[#14241c]">Journey completed</p>
            <p className="mt-1 text-sm text-[#3d5247]">
              All major home milestones are complete.
            </p>
            <button
              type="button"
              onClick={openJourney}
              className="mt-2 text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
            >
              View journey →
            </button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-[#3d5247]">
              {steps.filter((step) => step.mark === "done").length} of{" "}
              {steps.length} milestones completed
            </p>
            <ol className="mt-2">
              {steps.map((step) => (
                <li
                  key={step.key}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                    step.mark === "active"
                      ? "bg-[rgba(201,164,92,0.12)]"
                      : ""
                  }`}
                >
                  <Mark mark={step.mark} />
                  <p
                    className={`min-w-0 flex-1 ${
                      step.mark === "active"
                        ? "font-semibold text-[#14241c]"
                        : "font-medium text-[#14241c]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-sm ${
                      step.mark === "active"
                        ? "font-semibold text-[#7a5c22]"
                        : "text-[#3d5247]"
                    }`}
                  >
                    {step.status}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section id="interior" className="mt-10 scroll-mt-8">
        <SectionHead title="Interior" />
        <p className="mt-4 text-2xl font-semibold tracking-tight text-[#14241c]">
          {interior?.status ?? "Not started"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map((item) => {
            const className =
              "inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold ring-1 ring-[rgba(27,58,47,0.14)]";
            if (item.href && item.ready) {
              return (
                <Link key={item.id} href={item.href} className={`${className} text-[#14241c]`}>
                  {item.label}
                </Link>
              );
            }
            if (item.action === "3d") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => showPlan("3d")}
                  className={`${className} text-[#14241c]`}
                >
                  {item.label}
                </button>
              );
            }
            return (
              <span key={item.id} className={`${className} text-[#3d5247]`}>
                {item.label}
                <span className="ml-2 font-normal">Coming soon</span>
              </span>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <SectionHead title={`Everything about ${myFlat.flatNumber}`} />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              {
                href: "#interior",
                title: "Interior",
                copy: "Quotation, designs, materials and progress",
                action: "View interior",
              },
              {
                href: "#your-apartment",
                title: "Apartment",
                copy: "Floor plan, rooms, dimensions and layout",
                action: "View apartment",
              },
              {
                href: "#documents",
                title: "Documents",
                copy: "Important apartment documents and records",
                action: "View documents",
              },
              {
                href: "#stay",
                title: "Household",
                copy: "Owner, family members and occupancy",
                action: "Manage household",
              },
              {
                href: "/community",
                title: "Community",
                copy: "Floor, wing and neighbour information",
                action: "Explore community",
              },
              {
                href: "#activity",
                title: "Activity",
                copy: `Recent updates related to ${myFlat.flatNumber}`,
                action: "View activity",
              },
            ] as const
          ).map((card) => {
            const body = (
              <>
                <p className="font-semibold text-[#14241c]">{card.title}</p>
                <p className="mt-1 text-sm text-[#3d5247]">{card.copy}</p>
                <p className="mt-3 text-sm font-semibold text-[#1b3a2f]">
                  {card.action} →
                </p>
              </>
            );
            const className =
              "block w-full rounded-2xl bg-[#fffcf5] px-5 py-4 text-left ring-1 ring-[rgba(27,58,47,0.1)]";
            if (card.href === "#stay" || card.href === "#documents") {
              return (
                <li key={card.title}>
                  <button
                    type="button"
                    onClick={() =>
                      openSection(card.href === "#stay" ? "stay" : "documents")
                    }
                    className={className}
                  >
                    {body}
                  </button>
                </li>
              );
            }
            return (
              <li key={card.title}>
                <Link href={card.href} className={className}>
                  {body}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <SectionHead title="About your apartment" />
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {(
            [
              ["Configuration", typeLabel(myFlat.type)],
              [
                "Area",
                myFlat.areaSqft
                  ? `${myFlat.areaSqft.toLocaleString("en-IN")} sq ft`
                  : "—",
              ],
              ["Wing", myFlat.wing || "—"],
              ["Floor", String(myFlat.floor)],
              ["Facing", myFlat.facing ? facingLabel(myFlat.facing) : "—"],
              ["Bedrooms", String(groups.bedrooms.length || "—")],
              [
                "Kitchen",
                groups.kitchen?.dim ?? (groups.kitchen ? "In plan" : "—"),
              ],
              ["Drawing", drawing?.dim ?? (drawing ? "In plan" : "—")],
              ["Dining", dining?.dim ?? (dining ? "In plan" : "—")],
              ["Bathrooms", String(groups.toilets.length || "—")],
              ["Balconies", String(groups.balconies.length || "—")],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[#3d5247]">{label}</dt>
              <dd className="mt-0.5 font-semibold text-[#14241c]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <SectionHead
          title="Household"
          aside={
            ownedFlat ? (
              <button
                type="button"
                onClick={() => openSection("stay")}
                className="text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
              >
                Manage household →
              </button>
            ) : null
          }
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ProfileAvatar
            name={myFlat.ownerName || myFlat.flatNumber}
            photoUrl={myFlat.ownerPhotoUrl}
          />
          <div>
            <p className="font-semibold text-[#14241c]">
              {myFlat.ownerName || "Owner"}
            </p>
            <p className="text-sm text-[#3d5247]">Owner · {myFlat.flatNumber}</p>
          </div>
        </div>
        {members.length ? (
          <ul className="mt-4 divide-y divide-[rgba(27,58,47,0.08)]">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2.5">
                <ProfileAvatar
                  name={member.name}
                  photoUrl={member.photoUrl}
                  size="sm"
                  tone="member"
                />
                <div>
                  <p className="font-semibold text-[#14241c]">{member.name}</p>
                  <p className="text-sm text-[#3d5247]">
                    {relationLabel(member.relation)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[#3d5247]">
            No household members added yet.
          </p>
        )}
      </section>

      <section id="documents" className="mt-10 scroll-mt-8">
        <SectionHead
          title="Documents & records"
          aside={
            <button
              type="button"
              onClick={() => openSection("documents")}
              className="text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
            >
              View documents →
            </button>
          }
        />
        <p className="mt-4 max-w-xl text-sm text-[#3d5247]">
          Apartment documents, registration records and future interior records
          will appear here. Nothing is stored yet.
        </p>
      </section>

      <section className="mt-10">
        <SectionHead title="Your community" />
        <p className="mt-4 text-[#14241c]">
          {myFlat.flatNumber} · Wing {myFlat.wing} · Floor {myFlat.floor}
        </p>
        <p className="mt-1 text-sm text-[#3d5247]">
          {summary.sold} occupied · {summary.unsold} available
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <TextLink href="/community?view=3d">Explore site</TextLink>
          <TextLink href={`/community?floor=${myFlat.floor}`}>
            Floor {myFlat.floor}
          </TextLink>
          {includeOwners ? <TextLink href="/members">Directory</TextLink> : null}
          {includeOwners ? <TextLink href="/feed">Community feed</TextLink> : null}
        </nav>
      </section>

      <section id="activity" className="mt-10 scroll-mt-8">
        <SectionHead
          title="Recent activity"
          aside={includeOwners ? <TextLink href="/feed">All</TextLink> : undefined}
        />
        {homeActivity.length ? (
          <ol className="mt-2 divide-y divide-[rgba(27,58,47,0.08)]">
            {homeActivity.map((item) => (
              <li key={item.id} className="py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-[#14241c]">{item.title}</p>
                  <span className="text-sm text-[#3d5247]">
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
                {item.body ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[#3d5247]">
                    {item.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-[#3d5247]">
            No recent updates for {myFlat.flatNumber}.
          </p>
        )}
      </section>

      {journeyOpen ? (
        <JourneyDetail
          steps={steps}
          onClose={closeJourney}
          onViewCurrent={
            steps.some((step) => step.mark === "active" && step.key === "interior")
              ? () => {
                  closeJourney();
                  window.history.replaceState(null, "", "/#interior");
                  document.getElementById("interior")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              : undefined
          }
        />
      ) : null}
    </PageShell>
  );
}
