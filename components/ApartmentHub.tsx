"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FloorPlate2D } from "@/components/FlatPlan2D";
import {
  FlatTextFacts,
  FlatViews,
  toPlanInput,
  type FlatViewMode,
} from "@/components/FlatViews";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  apartmentLayout,
  formatRoomLine,
  heroMeta,
  interiorLinks,
  layoutGroups,
  occupancyCopy,
} from "@/lib/apartmentLayout";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import {
  formatShortDate,
  journeyMark,
  journeySteps,
} from "@/lib/homeDisplay";
import { relationLabel } from "@/lib/status";
import type { FlatMember, FlatRenter, OwnedFlat } from "@/lib/types";

export type HubActivity = {
  id: string
  title: string
  body: string | null
  createdAt: string
};

export type HubNeighbor = {
  flatNumber: string
  ownerName: string | null
};

function JourneyDot({ mark }: { readonly mark: "done" | "active" | "upcoming" }) {
  const symbol = mark === "done" ? "✓" : mark === "active" ? "●" : "";
  const tone =
    mark === "done"
      ? "bg-[#c9a45c] text-[#14241c]"
      : mark === "active"
        ? "ring-2 ring-[#c9a45c]"
        : "ring-1 ring-[rgba(232,213,163,0.35)]";
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${tone}`}
      aria-hidden
    >
      {symbol}
    </span>
  );
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

function HubSection({
  kicker,
  title,
  action,
  children,
  id,
}: {
  readonly kicker?: string
  readonly title: string
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly id?: string
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-end justify-between gap-4 border-b border-[rgba(27,58,47,0.1)] pb-2">
        <div>
          {kicker ? (
            <p className="text-xs font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
              {kicker}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold tracking-tight text-[#14241c] md:text-2xl">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CreamCard({ children }: { readonly children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] bg-[#fffcf5] p-5 text-[#14241c] shadow-[0_16px_48px_rgba(0,0,0,0.2)] md:p-7">
      {children}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  href,
  primary = false,
}: {
  readonly children: ReactNode
  readonly onClick?: () => void
  readonly href?: string
  readonly primary?: boolean
}) {
  const className = `inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${
    primary
      ? "bg-[#c9a45c] text-[#14241c]"
      : "bg-[rgba(232,213,163,0.12)] text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.28)]"
  }`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function ApartmentHub({
  flat,
  members,
  renters,
  neighbors,
  activity,
  viewMode,
  onViewMode,
  onManageJourney,
  onManageStay,
}: {
  readonly flat: OwnedFlat
  readonly members: FlatMember[]
  readonly renters: FlatRenter[]
  readonly neighbors: HubNeighbor[]
  readonly activity: HubActivity[]
  readonly viewMode: FlatViewMode
  readonly onViewMode: (mode: FlatViewMode) => void
  readonly onManageJourney: () => void
  readonly onManageStay: () => void
}) {
  const [interiorOpen, setInteriorOpen] = useState(flat.interior === "in_progress");
  const layout = apartmentLayout(flat);
  const groups = layoutGroups(layout);
  const steps = journeySteps(flat);
  const stay = occupancyCopy(flat);
  const links = interiorLinks(flat);
  const currentRenter = renters.find((row) => !row.endDate) ?? renters[0] ?? null;
  const listings = [
    flat.openForRent ? "Open for rent" : null,
    flat.openForResale ? "Open for resale" : null,
  ].filter(Boolean);

  function showPlan(mode: FlatViewMode) {
    onViewMode(mode);
    window.requestAnimationFrame(() => {
      document.getElementById("apartment-visual")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="space-y-10 md:space-y-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#c9a45c] uppercase">
            My flat
          </p>
          <h1 className="mt-2 font-semibold tracking-tight text-[#f7f2e6] text-[clamp(3.5rem,12vw,6.5rem)] leading-[0.84]">
            {flat.flatNumber}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-[#d0c090] md:text-base">
            {heroMeta(flat)}
          </p>
          {flat.ownerName ? (
            <p className="mt-3 text-lg text-[#e8d5a3]">{flat.ownerName}</p>
          ) : null}
          <p className="mt-1 text-sm text-[#b0a070]">{stay}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ActionButton primary onClick={() => showPlan("2d")}>
              View 2D Plan
            </ActionButton>
            <ActionButton onClick={() => showPlan("3d")}>View 3D</ActionButton>
            <ActionButton onClick={onManageStay}>Manage Stay</ActionButton>
          </div>

          <div id="apartment-visual" className="mt-8 scroll-mt-6">
            <FlatViews
              flat={toPlanInput(flat)}
              tone="dark"
              mode={viewMode}
              onModeChange={onViewMode}
              text={<FlatTextFacts flat={toPlanInput(flat)} tone="dark" />}
            />
          </div>
        </div>

        <aside className="space-y-8 lg:pt-10">
          <div>
            <h2 className="border-b border-[rgba(232,213,163,0.2)] pb-2 text-lg font-semibold text-[#f7f2e6]">
              Apartment facts
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              {(
                [
                  ["Type", typeLabel(flat.type)],
                  [
                    "Area",
                    flat.areaSqft
                      ? `${flat.areaSqft.toLocaleString("en-IN")} sq ft`
                      : "—",
                  ],
                  ["Floor", String(flat.floor)],
                  ["Wing", flat.wing || "—"],
                  ["Facing", flat.facing ? facingLabel(flat.facing) : "—"],
                  ["Status", stay],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[#b0a070]">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-[#f7f2e6]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 border-b border-[rgba(232,213,163,0.2)] pb-2">
              <h2 className="text-lg font-semibold text-[#f7f2e6]">Home journey</h2>
              <button
                type="button"
                onClick={onManageJourney}
                className="text-sm font-semibold text-[#c9a45c]"
              >
                Manage journey
              </button>
            </div>
            <ol className="mt-2">
              {steps.map((step) => {
                const mark = journeyMark(step.key, step.value);
                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-3 border-b border-[rgba(232,213,163,0.1)] py-3.5 last:border-b-0"
                  >
                    <JourneyDot mark={mark} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#f7f2e6]">{step.label}</p>
                      <p className="text-sm text-[#b0a070]">
                        {step.status}
                        {step.date ? ` · ${formatShortDate(step.date)}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      <CreamCard>
        <HubSection
          title="Interior"
          action={
            <button
              type="button"
              onClick={() => setInteriorOpen((open) => !open)}
              className="text-sm font-semibold text-[#1b3a2f]"
            >
              {interiorOpen ? "Hide" : "Open hub"}
            </button>
          }
        >
          <p className="text-2xl font-semibold tracking-tight">
            {steps.find((step) => step.key === "interior")?.status ?? "Not started"}
          </p>
          {flat.interiorStartDate || flat.interiorDate ? (
            <p className="mt-1 text-sm text-[#3d5247]">
              {[
                flat.interiorStartDate
                  ? `Started ${formatShortDate(flat.interiorStartDate)}`
                  : null,
                flat.interiorDate
                  ? `Completed ${formatShortDate(flat.interiorDate)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          {interiorOpen ? (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {links.map((item) => {
                const body = (
                  <>
                    <span className="font-semibold text-[#14241c]">{item.label}</span>
                    <span className="text-sm text-[#3d5247]">
                      {item.ready ? "Open" : "Coming later"}
                    </span>
                  </>
                );
                const className =
                  "flex min-h-14 items-center justify-between rounded-2xl bg-[rgba(27,58,47,0.05)] px-4 ring-1 ring-[rgba(27,58,47,0.08)]";
                if (item.href && item.ready) {
                  return (
                    <li key={item.id}>
                      <Link href={item.href} className={className}>
                        {body}
                      </Link>
                    </li>
                  );
                }
                if (item.action === "3d") {
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => showPlan("3d")}
                        className={`w-full ${className} text-left`}
                      >
                        {body}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={item.id} className={`${className} opacity-70`}>
                    {body}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </HubSection>
      </CreamCard>

      <CreamCard>
        <HubSection title="Apartment details">
          <dl className="grid gap-4 sm:grid-cols-2">
            {groups.living.map((room) => (
              <div key={room.id}>
                <dt className="text-sm text-[#3d5247]">{room.label}</dt>
                <dd className="font-semibold">{room.dim ?? "Brochure typical"}</dd>
              </div>
            ))}
            {groups.bedrooms.map((room) => (
              <div key={room.id}>
                <dt className="text-sm text-[#3d5247]">{room.label}</dt>
                <dd className="font-semibold">{room.dim ?? "—"}</dd>
              </div>
            ))}
            {groups.kitchen ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Kitchen</dt>
                <dd className="font-semibold">
                  {groups.kitchen.dim ?? groups.kitchen.label}
                </dd>
              </div>
            ) : null}
            {groups.puja ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Puja</dt>
                <dd className="font-semibold">{groups.puja.dim ?? "In plan"}</dd>
              </div>
            ) : null}
            {groups.wash ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Wash / utility</dt>
                <dd className="font-semibold">
                  {groups.wash.dim ?? groups.wash.label}
                </dd>
              </div>
            ) : null}
            {groups.toilets.length ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Toilets</dt>
                <dd className="font-semibold">
                  {groups.toilets.map(formatRoomLine).join(" · ")}
                </dd>
              </div>
            ) : null}
            {groups.balconies.length ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Balconies</dt>
                <dd className="font-semibold">
                  {groups.balconies.map(formatRoomLine).join(" · ")}
                </dd>
              </div>
            ) : null}
          </dl>
          {layout.stack ? (
            <p className="mt-5 text-sm text-[#3d5247]">
              Brochure stack {layout.stack}
              {layout.typeCode ? ` · ${layout.typeCode}` : ""}
              {layout.sbuaSft
                ? ` · SBUA ${layout.sbuaSft.toLocaleString("en-IN")} sq ft`
                : ""}
              . North is the top of the drawing.
            </p>
          ) : null}
        </HubSection>
      </CreamCard>

      <CreamCard>
        <HubSection title="Documents & records">
          <p className="max-w-xl text-[#3d5247]">
            No apartment files are stored here yet. The brochure floor plan is in
            the visualization above. Quotations, allotment papers and interior
            documents will appear in this section when they are added.
          </p>
        </HubSection>
      </CreamCard>

      <CreamCard>
        <HubSection
          title="Ownership & household"
          action={
            <button
              type="button"
              onClick={onManageStay}
              className="text-sm font-semibold text-[#1b3a2f]"
            >
              Manage ownership & stay
            </button>
          }
        >
          <div className="flex items-center gap-3">
            <ProfileAvatar
              name={flat.ownerName || flat.flatNumber}
              photoUrl={flat.ownerPhotoUrl}
              size="md"
            />
            <div>
              <p className="text-sm text-[#3d5247]">Owner</p>
              <p className="font-semibold">{flat.ownerName || "—"}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-[#3d5247]">Family members</p>
            {members.length ? (
              <ul className="mt-2 divide-y divide-[rgba(27,58,47,0.08)]">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 py-2.5">
                    <ProfileAvatar
                      name={member.name}
                      photoUrl={member.photoUrl}
                      size="sm"
                      tone="member"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-[#3d5247]">
                        {relationLabel(member.relation)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[#3d5247]">No household members added yet.</p>
            )}
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#3d5247]">Occupancy</dt>
              <dd className="font-semibold">{stay}</dd>
            </div>
            <div>
              <dt className="text-sm text-[#3d5247]">Listings</dt>
              <dd className="font-semibold">
                {listings.length ? listings.join(" · ") : "None open"}
              </dd>
            </div>
            {stay === "Rented" && currentRenter ? (
              <div>
                <dt className="text-sm text-[#3d5247]">Current renter</dt>
                <dd className="font-semibold">{currentRenter.name}</dd>
              </div>
            ) : null}
          </dl>
        </HubSection>
      </CreamCard>

      <CreamCard>
        <HubSection title="Community">
          <p className="text-lg font-semibold">
            Wing {flat.wing} · Floor {flat.floor}
          </p>
          <p className="mt-1 text-sm text-[#3d5247]">
            {neighbors.length
              ? `${neighbors.length} other homes on this floor`
              : "Floor homes from the site inventory"}
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-[rgba(27,58,47,0.1)]">
            <FloorPlate2D floor={flat.floor} highlight={flat.flatNumber} />
          </div>

          {neighbors.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {neighbors.map((home) => (
                <li
                  key={home.flatNumber}
                  className="rounded-full bg-[rgba(27,58,47,0.05)] px-3 py-1.5 text-sm text-[#14241c] ring-1 ring-[rgba(27,58,47,0.08)]"
                >
                  <span className="font-semibold">{home.flatNumber}</span>
                  {home.ownerName ? (
                    <span className="text-[#3d5247]"> · {home.ownerName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#1b3a2f]">
            <Link className="underline-offset-4 hover:underline" href={`/community?floor=${flat.floor}`}>
              View Floor
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/community?view=3d">
              View Community
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/members">
              Directory
            </Link>
          </nav>
        </HubSection>
      </CreamCard>

      <CreamCard>
        <HubSection title={`${flat.flatNumber} activity`}>
          {activity.length ? (
            <ol className="divide-y divide-[rgba(27,58,47,0.08)]">
              {activity.map((item) => (
                <li key={item.id} className="py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-sm text-[#3d5247]">
                      {relativeTime(item.createdAt)}
                    </span>
                  </div>
                  {item.body ? (
                    <p className="mt-1 text-sm text-[#3d5247]">{item.body}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="max-w-xl text-[#3d5247]">
              Nothing new for {flat.flatNumber} yet. Journey changes and community
              notes for this home will appear here.
            </p>
          )}
        </HubSection>
      </CreamCard>
    </div>
  );
}
