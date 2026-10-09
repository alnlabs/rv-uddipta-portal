"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FlatPlan2D } from "@/components/FlatPlan2D";
import { PageShell, Segmented, TextLink } from "@/components/chrome";
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
import { summarize } from "@/lib/flats";
import { greeting, journeyHeadline, journeySteps } from "@/lib/homeDisplay";
import { visibleText } from "@/lib/richText";
import { relationLabel } from "@/lib/status";
import type { FlatMember, FlatRenter, OwnedFlat, PublicFlat } from "@/lib/types";

const FlatUnit3D = dynamic(() => import("@/components/FlatUnit3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[22rem] place-items-center bg-[#1e293b] text-sm font-semibold text-[#f8fafc] md:h-[26rem]">
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
      <span className="grid size-6 place-items-center rounded-full bg-[#f8fafc] text-[11px] font-bold text-[#1e293b]">
        ✓
      </span>
    );
  }
  if (mark === "active") {
    return (
      <span className="grid size-6 place-items-center rounded-full ring-2 ring-[#059669]">
        <span className="size-2 rounded-full bg-[#059669]" />
      </span>
    );
  }
  return <span className="grid size-6 place-items-center rounded-full ring-1 ring-[rgba(15,23,42,0.22)]" />;
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
  canEditHome = true,
  needsAction = [],
  todayItems = [],
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
  canEditHome?: boolean
  needsAction?: { title: string; detail: string; href: string }[]
  todayItems?: { title: string; when: string; href: string }[]
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

  if (ownedFlat && section === "stay" && canEditHome) {
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
          <h1 className="font-semibold tracking-tight text-[#0f172a] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
            Home records
          </h1>
          <button
            type="button"
            onClick={() => openSection("hub")}
            aria-label={`Close and return to ${myFlat.flatNumber}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)] hover:bg-[rgba(15,23,42,0.05)]"
          >
            ×
          </button>
        </div>
        <p className="mt-4 max-w-xl text-[#475569]">
          This is a written list for the home: the possession letter, verification, and where each paper is kept. Floor
          plans stay in Your apartment.
        </p>
        <p className="mt-4">
          <TextLink href="/documents">Open home records →</TextLink>
        </p>
      </PageShell>
    );
  }

  if (!myFlat) {
    return (
      <PageShell wide>
        <p className="text-sm text-[#b45309]">{hello}</p>
        <h1 className="mt-2 font-semibold tracking-tight text-[#0f172a] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
          My flat
        </h1>
        <p className="mt-3 max-w-xl text-[#475569]">
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

  const roomFacts = [
    ["Bedrooms", String(groups.bedrooms.length || "—")],
    ["Bathrooms", String(groups.toilets.length || "—")],
    ["Balconies", String(groups.balconies.length || "—")],
    ["Kitchen", groups.kitchen?.dim ?? (groups.kitchen ? "In plan" : "—")],
    ["Drawing", drawing?.dim ?? (drawing ? "In plan" : "—")],
    ["Dining", dining?.dim ?? (dining ? "In plan" : "—")],
  ] as const;
  const people = [
    {
      key: "owner",
      name: myFlat.ownerName || "Owner",
      role: "Owner",
      photo: myFlat.ownerPhotoUrl,
      tone: "owner" as const,
    },
    ...members.map((member) => ({
      key: `member-${member.id}`,
      name: member.name,
      role: relationLabel(member.relation),
      photo: member.photoUrl,
      tone: "member" as const,
    })),
    ...renters.map((renter) => ({
      key: `renter-${renter.id}`,
      name: renter.name,
      role: renter.endDate ? "Former tenant" : "Tenant",
      photo: null,
      tone: "member" as const,
    })),
  ];
  const doneCount = steps.filter((step) => step.mark === "done").length;

  return (
    <PageShell wide>
      <section id="your-apartment" className="scroll-mt-8 text-[#0f172a]">
        <div className="home-stage rounded-[1.75rem] px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-[#b45309]">{hello}</p>
            <h1 className="mt-1 font-semibold tracking-tight text-[clamp(3.2rem,9vw,5.5rem)] leading-[0.88]">
              {myFlat.flatNumber}
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[#475569] md:text-base">{heroMeta(myFlat)}</p>
            <p className="mt-1 text-sm text-[#0f172a]">
              {myFlat.ownerName ? `${myFlat.ownerName} · ` : ""}
              {stay}
            </p>
            {canEditHome ? null : (
              <p className="mt-1 text-sm text-[#475569]">The owner keeps the records for this home.</p>
            )}
          </div>
          {ownedFlat && canEditHome ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openSection("stay")}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#1e293b] ring-1 ring-[rgba(15,23,42,0.18)]"
              >
              Household
            </button>
            </div>
          ) : null}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {roomFacts.map(([label, value]) => (
            <div key={label}>
              <dd className={`font-semibold tracking-tight text-[#0f172a] ${value.length > 6 ? "text-base" : "text-2xl"}`}>
                {value}
              </dd>
              <dt className="mt-1 text-xs text-[#475569]">{label}</dt>
            </div>
          ))}
        </dl>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#475569]">Plan</p>
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
          {mode === "2d" ? (
            <div className="mx-auto max-w-3xl p-2 md:p-4">
              <FlatPlan2D compact homeLabel={myFlat.flatNumber} flat={planInput(myFlat)} />
            </div>
          ) : (
            <FlatUnit3D flat={planInput(myFlat)} />
          )}
        </div>
      </section>

      {needsAction.length || todayItems.length ? (
        <section className={`mt-6 grid gap-4 ${needsAction.length && todayItems.length ? "lg:grid-cols-2" : ""}`}>
          {needsAction.length ? (
            <div className="slab p-4">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">
                Needs action
              </h2>
              <ul className="mt-3 grid gap-3">
                {needsAction.map((item) => (
                  <li key={`${item.title}-${item.detail}`}>
                    <Link href={item.href} className="block">
                      <span className="font-semibold text-[#0f172a]">{item.title}</span>
                      <span className="mt-1 block text-sm text-[#475569]">{visibleText(item.detail)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {todayItems.length ? (
            <div className="slab p-4">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">
                Today
              </h2>
              <ul className="mt-3 grid gap-3">
                {todayItems.map((item) => (
                  <li key={`${item.title}-${item.when}`}>
                    <Link href={item.href} className="block">
                      <span className="font-semibold text-[#0f172a]">{item.title}</span>
                      <span className="mt-1 block text-sm text-[#475569]">{item.when}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">Home journey</h2>
            <p className="mt-1 text-sm text-[#475569]">
              {journeyHeadline(steps)} · {doneCount} of {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={openJourney}
            className="text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline"
          >
            Open
          </button>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.key}>
              <button
                type="button"
                onClick={openJourney}
                className={`flex h-full w-full flex-col rounded-2xl p-4 text-left ${
                  step.mark === "active"
                    ? "bg-[#ecfdf5] ring-1 ring-[#059669]"
                    : step.mark === "done"
                      ? "bg-[#1e293b] text-[#f8fafc]"
                      : "bg-white ring-1 ring-[rgba(15,23,42,0.1)]"
                }`}
              >
                <Mark mark={step.mark} />
                <p className="mt-4 font-semibold">{step.label}</p>
                <p className={`mt-1 text-sm ${step.mark === "done" ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  {step.status}
                </p>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">People in this home</h2>
          {ownedFlat && canEditHome ? (
            <button
              type="button"
              onClick={() => openSection("stay")}
              className="text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline"
            >
              Manage
            </button>
          ) : null}
        </div>
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {people.map((person) => (
            <li
              key={person.key}
              className="flex w-36 shrink-0 flex-col items-center rounded-2xl bg-white px-3 py-4 text-center ring-1 ring-[rgba(15,23,42,0.1)]"
            >
              <ProfileAvatar name={person.name} photoUrl={person.photo} tone={person.tone} />
              <p className="mt-3 line-clamp-2 text-sm font-semibold text-[#0f172a]">{person.name}</p>
              <p className="mt-1 text-xs text-[#475569]">{person.role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="documents" className="mt-8 scroll-mt-8 grid gap-3 md:grid-cols-3">
        <article id="interior" className="scroll-mt-8 overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-[rgba(15,23,42,0.1)]">
          <div className="h-1.5 bg-[#059669]" />
          <div className="p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#047857] uppercase">Interior</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a]">
              {interior?.status ?? "Not started"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {links.filter((item) => item.ready).map((item) =>
                item.href ? (
                  <Link key={item.id} href={item.href} className="text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => showPlan("3d")} className="text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline">
                    {item.label}
                  </button>
                ),
              )}
            </div>
            {links.some((item) => !item.ready) ? (
              <p className="mt-3 text-sm text-[#475569]">
                Still to come: {links.filter((item) => !item.ready).map((item) => item.label).join(", ")}.
              </p>
            ) : null}
          </div>
        </article>
        <article className="overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-[rgba(15,23,42,0.1)]">
          <div className="h-1.5 bg-[#b45309]" />
          <div className="p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#b45309] uppercase">Home records</p>
            <p className="mt-2 text-sm text-[#475569]">
              Possession letter, verification, and where each paper is kept.
            </p>
            <button
              type="button"
              onClick={() => openSection("documents")}
              className="mt-4 text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline"
            >
              View records →
            </button>
          </div>
        </article>
        <article className="overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-[rgba(15,23,42,0.1)]">
          <div className="h-1.5 bg-[#1e293b]" />
          <div className="p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#1e293b] uppercase">In the building</p>
            <p className="mt-2 text-sm text-[#475569]">
              Wing {myFlat.wing} · Floor {myFlat.floor}
            </p>
            <p className="mt-1 text-sm text-[#475569]">
              {summary.sold} occupied · {summary.unsold} available
            </p>
            <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <TextLink href="/community?view=building">Building</TextLink>
              <TextLink href={`/community?view=floor&floor=${myFlat.floor}`}>Floor {myFlat.floor}</TextLink>
              {includeOwners ? <TextLink href="/members">Neighbours</TextLink> : null}
              {includeOwners ? <TextLink href="/feed">Updates</TextLink> : null}
            </nav>
          </div>
        </article>
      </section>

      <section id="activity" className="mt-8 scroll-mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">Recent activity</h2>
          {includeOwners ? <TextLink href="/feed">All</TextLink> : null}
        </div>
        {homeActivity.length ? (
          <ol className="mt-4 grid gap-3">
            {homeActivity.map((item) => (
              <li key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-[rgba(15,23,42,0.1)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-[#0f172a]">{item.title}</p>
                  <span className="text-sm text-[#475569]">{relativeTime(item.createdAt)}</span>
                </div>
                {item.body ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[#475569]">{visibleText(item.body)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-[#475569]">No recent updates for {myFlat.flatNumber}.</p>
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
