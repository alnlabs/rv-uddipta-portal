"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MembersEditor from "@/components/MembersEditor";
import RentersEditor from "@/components/RentersEditor";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { interiorLinks } from "@/lib/apartmentLayout";
import { cleanError } from "@/lib/auth";
import { normalizeSaleFields } from "@/lib/flatDisplay";
import {
  formatShortDate,
  journeyExplain,
  journeyHeadline,
  journeyStatusCopy,
  journeyMark,
} from "@/lib/homeDisplay";
import { normalizePhone } from "@/lib/phone";
import {
  STATUS_FIELDS,
  type StatusDateKey,
  type StatusKey,
} from "@/lib/status";
import type { FlatMember, FlatRenter, Occupancy, OwnedFlat, SaleStatus } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { mapOwnedFlat } from "@/lib/flats";
import { recordFlatActivity } from "@/app/actions/flat-activity";

type JourneyState = {
  registration: string;
  interior: string;
  ceremony: string;
  moving: string;
  registrationDate: string;
  interiorStartDate: string;
  interiorDate: string;
  ceremonyDate: string;
  movingDate: string;
};

type OccupancyState = {
  saleStatus: SaleStatus;
  occupancy: Occupancy | null;
  tenantName: string;
  tenantPhone: string;
  openForRent: boolean;
  openForResale: boolean;
};

type Panel = "journey" | "stay";

function dateInput(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDone(key: StatusKey, value: string) {
  if (key === "moving") return value === "moved_in";
  return value === "completed";
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-sm text-[#d0c090]">
        {label}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 border border-[rgba(232,213,163,0.22)] bg-transparent px-3 text-base font-normal text-[#f7f2e6] outline-none focus:border-[#c9a45c]"
        />
      </label>
      <div className="flex gap-2 pb-1">
        <button
          type="button"
          onClick={() => onChange(todayIso())}
          className="min-h-11 rounded-full bg-[rgba(27,58,47,0.08)] px-3 text-sm font-semibold text-[#1b3a2f]"
        >
          Today
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-h-11 rounded-full px-3 text-sm font-semibold text-[#8a2f2f]"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function journeyFromFlat(flat: OwnedFlat): JourneyState {
  return {
    registration: flat.registration,
    interior: flat.interior,
    ceremony: flat.ceremony,
    moving: flat.moving,
    registrationDate: dateInput(flat.registrationDate),
    interiorStartDate: dateInput(flat.interiorStartDate),
    interiorDate: dateInput(flat.interiorDate),
    ceremonyDate: dateInput(flat.ceremonyDate),
    movingDate: dateInput(flat.movingDate),
  };
}

function occupancyFromFlat(flat: OwnedFlat): OccupancyState {
  return {
    saleStatus: flat.saleStatus === "sold" ? "sold" : "unsold",
    occupancy: flat.occupancy,
    tenantName: flat.tenantName ?? "",
    tenantPhone: flat.tenantPhone ?? "",
    openForRent: Boolean(flat.openForRent),
    openForResale: Boolean(flat.openForResale),
  };
}

function snapshot(state: JourneyState) {
  return JSON.stringify(state);
}

function occupancySnapshot(state: OccupancyState) {
  return JSON.stringify(state);
}

export default function UpdateForm({
  ownerPhoneMasked,
  initialFlat,
  initialMembers,
  initialRenters,
  initialPanel = "stay",
  onClose,
}: {
  ownerPhoneMasked: string;
  initialFlat: OwnedFlat;
  initialMembers: FlatMember[];
  initialRenters: FlatRenter[];
  initialPanel?: Panel;
  onClose?: () => void;
}) {
  const [flat, setFlat] = useState(initialFlat);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [form, setForm] = useState<JourneyState>(() => journeyFromFlat(initialFlat));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot(journeyFromFlat(initialFlat)),
  );
  const [ownerName, setOwnerName] = useState(initialFlat.ownerName);
  const [savedOwnerName, setSavedOwnerName] = useState(initialFlat.ownerName);
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState(initialFlat.ownerPhotoUrl);
  const [occupancyForm, setOccupancyForm] = useState<OccupancyState>(() =>
    occupancyFromFlat(initialFlat),
  );
  const [savedOccupancy, setSavedOccupancy] = useState(() =>
    occupancySnapshot(occupancyFromFlat(initialFlat)),
  );
  const [stepMessage, setStepMessage] = useState<Partial<Record<StatusKey, string>>>({});
  const [stepError, setStepError] = useState<Partial<Record<StatusKey, string>>>({});
  const [savingStep, setSavingStep] = useState<StatusKey | null>(null);
  const [ownerMessage, setOwnerMessage] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [occupancyMessage, setOccupancyMessage] = useState("");
  const [occupancyError, setOccupancyError] = useState("");
  const [occupancyBusy, setOccupancyBusy] = useState(false);
  const [openStep, setOpenStep] = useState<StatusKey | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "stay") setPanel(hash);
  }, []);

  function goHome() {
    if (onClose) {
      onClose();
      return;
    }
    window.location.assign("/");
  }

  const ownerDirty = ownerName.trim() !== savedOwnerName.trim();
  const occupancyDirty = occupancySnapshot(occupancyForm) !== savedOccupancy;

  function milestoneSlice(key: StatusKey, state: JourneyState) {
    if (key === "registration") {
      return {
        registration: state.registration,
        registrationDate: state.registrationDate,
      };
    }
    if (key === "interior") {
      return {
        interior: state.interior,
        interiorStartDate: state.interiorStartDate,
        interiorDate: state.interiorDate,
      };
    }
    if (key === "ceremony") {
      return {
        ceremony: state.ceremony,
        ceremonyDate: state.ceremonyDate,
      };
    }
    return {
      moving: state.moving,
      movingDate: state.movingDate,
    };
  }

  function milestoneDirty(key: StatusKey) {
    const saved = JSON.parse(savedSnapshot) as JourneyState;
    return (
      JSON.stringify(milestoneSlice(key, form)) !==
      JSON.stringify(milestoneSlice(key, saved))
    );
  }

  function milestonePatch(key: StatusKey) {
    if (key === "registration") {
      return {
        registration: form.registration,
        registration_date: form.registrationDate || null,
      };
    }
    if (key === "interior") {
      return {
        interior: form.interior,
        interior_start_date: form.interiorStartDate || null,
        interior_date: form.interiorDate || null,
      };
    }
    if (key === "ceremony") {
      return {
        ceremony: form.ceremony,
        ceremony_date: form.ceremonyDate || null,
      };
    }
    return {
      moving: form.moving,
      moving_date: form.movingDate || null,
    };
  }

  const progress = useMemo(() => {
    const steps = STATUS_FIELDS.map((field) => {
      const value = form[field.key as StatusKey];
      return {
        key: field.key as StatusKey,
        label: field.label,
        value,
        done: isDone(field.key, value),
        options: field.options,
        dateKey: field.dateKey as StatusDateKey,
      };
    });
    return {
      steps,
      doneCount: steps.filter((step) => step.done).length,
      total: steps.length,
    };
  }, [form]);

  function setStatus(key: StatusKey, value: string, dateKey: StatusDateKey) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "interior") {
        if (value === "in_progress" && !prev.interiorStartDate) {
          next.interiorStartDate = todayIso();
        }
        if (value === "completed") {
          if (!prev.interiorStartDate) next.interiorStartDate = todayIso();
          if (!prev.interiorDate) next.interiorDate = todayIso();
        }
        return next;
      }
      if (isDone(key, value) && !prev[dateKey]) next[dateKey] = todayIso();
      return next;
    });
    setStepMessage((prev) => ({ ...prev, [key]: "" }));
    setStepError((prev) => ({ ...prev, [key]: "" }));
  }

  async function onSaveMilestone(key: StatusKey) {
    setSavingStep(key);
    setStepError((prev) => ({ ...prev, [key]: "" }));
    setStepMessage((prev) => ({ ...prev, [key]: "" }));
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("flats")
        .update(milestonePatch(key))
        .eq("flat_number", flat.flatNumber)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const owned = mapOwnedFlat(data);
      if (owned) {
        setFlat(owned);
        const ownedJourney = journeyFromFlat(owned);
        const slice = milestoneSlice(key, ownedJourney);
        setForm((prev) => ({ ...prev, ...slice }));
        setSavedSnapshot((prev) => {
          const saved = JSON.parse(prev) as JourneyState;
          return snapshot({ ...saved, ...slice });
        });
      }
      setStepMessage((prev) => ({ ...prev, [key]: "Saved." }));
      void recordFlatActivity({
        flatNumber: flat.flatNumber,
        kind: "journey_updated",
        title: `${flat.flatNumber} updated ${key}`,
        visibility: "community",
        notify: "flat_and_admins",
        href: "/community",
      });
    } catch (err) {
      setStepError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Update failed",
      }));
    } finally {
      setSavingStep(null);
    }
  }

  async function onSaveOwner(e: React.FormEvent) {
    e.preventDefault();
    const name = ownerName.trim();
    if (name.length < 2) {
      setOwnerError("Owner name must be at least 2 characters.");
      return;
    }
    setOwnerBusy(true);
    setOwnerError("");
    setOwnerMessage("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("flats")
        .update({ owner_name: name })
        .eq("flat_number", flat.flatNumber)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const owned = mapOwnedFlat(data);
      if (owned) {
        setFlat(owned);
        setOwnerName(owned.ownerName);
        setSavedOwnerName(owned.ownerName);
        setOwnerPhotoUrl(owned.ownerPhotoUrl);
      }
      setOwnerMessage("Owner saved.");
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Could not save owner");
    } finally {
      setOwnerBusy(false);
    }
  }

  async function onSaveOccupancy(e: React.FormEvent) {
    e.preventDefault();
    if (occupancyForm.saleStatus === "sold" && !occupancyForm.occupancy) {
      setOccupancyError("Choose owner stay or rented for a sold flat.");
      return;
    }

    setOccupancyBusy(true);
    setOccupancyError("");
    setOccupancyMessage("");
    try {
      const salePatch = normalizeSaleFields({
        saleStatus: occupancyForm.saleStatus,
        occupancy:
          occupancyForm.saleStatus === "sold"
            ? occupancyForm.occupancy ?? "owner_stay"
            : null,
        tenantName: occupancyForm.tenantName,
        tenantPhone: normalizePhone(occupancyForm.tenantPhone) ?? "",
        openForRent: occupancyForm.openForRent,
        openForResale: occupancyForm.openForResale,
      });
      if (salePatch.occupancy === "rented") {
        salePatch.tenant_name = flat.tenantName || null;
        salePatch.tenant_phone = flat.tenantPhone || null;
      }

      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("flats")
        .update(salePatch)
        .eq("flat_number", flat.flatNumber)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const owned = mapOwnedFlat(data);
      const prev = JSON.parse(savedOccupancy) as OccupancyState;
      if (owned) {
        setFlat(owned);
        const nextOcc = occupancyFromFlat(owned);
        setOccupancyForm(nextOcc);
        setSavedOccupancy(occupancySnapshot(nextOcc));
      }
      setOccupancyMessage("Occupancy saved.");
      if (occupancyForm.openForRent && !prev.openForRent) {
        void recordFlatActivity({
          flatNumber: flat.flatNumber,
          kind: "listing_open_rent",
          title: `${flat.flatNumber} is open for rent`,
          visibility: "public",
          notify: "all_profiles",
          href: "/",
        });
      } else if (!occupancyForm.openForRent && prev.openForRent) {
        void recordFlatActivity({
          flatNumber: flat.flatNumber,
          kind: "listing_closed",
          title: `${flat.flatNumber} closed rent listing`,
          visibility: "public",
          notify: "all_profiles",
          href: "/",
        });
      }
      if (occupancyForm.openForResale && !prev.openForResale) {
        void recordFlatActivity({
          flatNumber: flat.flatNumber,
          kind: "listing_open_resale",
          title: `${flat.flatNumber} is open for resale`,
          visibility: "public",
          notify: "all_profiles",
          href: "/",
        });
      } else if (!occupancyForm.openForResale && prev.openForResale) {
        void recordFlatActivity({
          flatNumber: flat.flatNumber,
          kind: "listing_closed",
          title: `${flat.flatNumber} closed resale listing`,
          visibility: "public",
          notify: "all_profiles",
          href: "/",
        });
      }
      if (
        occupancyForm.saleStatus === "sold" &&
        occupancyForm.occupancy &&
        occupancyForm.occupancy !== prev.occupancy
      ) {
        void recordFlatActivity({
          flatNumber: flat.flatNumber,
          kind: "occupancy_changed",
          title: `${flat.flatNumber} marked ${
            occupancyForm.occupancy === "rented" ? "rented" : "owner stay"
          }`,
          visibility: "community",
          notify: "community",
          href: "/community",
        });
      }
    } catch (err) {
      setOccupancyError(
        err instanceof Error ? err.message : "Could not save occupancy",
      );
    } finally {
      setOccupancyBusy(false);
    }
  }

  return (
    <div className="relative min-h-full bg-[#14241c] text-[#f7f2e6]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(201,164,92,0.22), transparent 55%), radial-gradient(ellipse 70% 60% at 90% 10%, rgba(47,90,72,0.55), transparent 50%)",
        }}
      />

      <section className="page-gutter relative max-w-5xl pb-24 pt-6 md:pb-16 md:pt-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[clamp(2.25rem,6vw,3.5rem)] font-semibold leading-[0.95] tracking-tight text-[#f7f2e6]">
              {panel === "journey" ? "Home journey" : "Ownership & stay"}
            </h1>
            {panel === "journey" ? (
              <p className="mt-2 text-[#d0c090]">
                Your journey to move into {flat.flatNumber}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={goHome}
            aria-label={`Close and return to ${flat.flatNumber}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.28)] hover:bg-[rgba(232,213,163,0.08)]"
          >
            ×
          </button>
        </div>

        {panel === "journey" ? (
          <div className="min-h-[calc(100dvh-12rem)]">
            <p className="text-lg font-semibold text-[#f7f2e6]">
              {progress.doneCount} of {progress.total} milestones completed
            </p>
            <p className="mt-1 text-[#c9a45c]">{journeyHeadline(
              progress.steps.map((step) => ({
                key: step.key,
                label: step.label,
                value: step.value,
                mark: journeyMark(step.key, step.value),
                status: journeyStatusCopy(step.key, step.value),
                date: null,
              })),
            )}</p>

            <ol className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#d0c090]">
              {progress.steps.map((step) => {
                const mark = journeyMark(step.key, step.value);
                return (
                  <li key={step.key} className="flex items-center gap-1.5">
                    <span aria-hidden>
                      {mark === "done" ? "✓" : mark === "active" ? "●" : "○"}
                    </span>
                    {step.label}
                  </li>
                );
              })}
            </ol>

            <ol className="mt-10">
              {progress.steps.map((step, index) => {
                const dirtyStep = milestoneDirty(step.key);
                const saving = savingStep === step.key;
                const open = openStep === step.key;
                const mark = journeyMark(step.key, step.value);
                const current = mark === "active";
                const date =
                  step.key === "interior"
                    ? form.interiorDate || form.interiorStartDate
                    : form[step.dateKey];
                const last = index === progress.steps.length - 1;
                const tasks = interiorLinks(flat);
                return (
                  <li key={step.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                          mark === "done"
                            ? "bg-[#c9a45c] text-[#14241c]"
                            : current
                              ? "ring-2 ring-[#c9a45c]"
                              : "ring-1 ring-[rgba(232,213,163,0.28)]"
                        }`}
                        aria-hidden
                      >
                        {mark === "done" ? "✓" : current ? "●" : ""}
                      </span>
                      {last ? null : (
                        <span
                          className={`mt-1 min-h-[2.5rem] w-px flex-1 ${
                            mark === "done"
                              ? "bg-[#c9a45c]"
                              : "bg-[rgba(232,213,163,0.22)]"
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>

                    <div className={`min-w-0 pb-8 ${current ? "pb-10" : ""} ${last ? "pb-0" : ""}`}>
                      <div
                        className={
                          current
                            ? "rounded-[1.25rem] bg-[rgba(232,213,163,0.08)] p-5 ring-1 ring-[rgba(201,164,92,0.28)]"
                            : ""
                        }
                      >
                        <h2
                          className={`font-semibold tracking-tight ${
                            current
                              ? "text-2xl text-[#f7f2e6] md:text-3xl"
                              : "text-lg text-[#f7f2e6]"
                          }`}
                        >
                          {step.label}
                        </h2>
                        <p className={`mt-1 ${current ? "text-[#c9a45c]" : "text-sm text-[#b0a070]"}`}>
                          {journeyStatusCopy(step.key, step.value)}
                          {step.key === "registration" && date
                            ? ` · ${formatShortDate(date)}`
                            : ""}
                        </p>
                        <p className={`mt-2 max-w-xl ${current ? "text-[#e8d5a3]" : "text-sm text-[#d0c090]"}`}>
                          {journeyExplain(step.key, step.value)}
                        </p>

                        {step.key === "ceremony" || step.key === "moving" ? (
                          <p className="mt-3 text-sm text-[#b0a070]">
                            {step.key === "ceremony" ? "Date" : "Move-in date"}
                            {" · "}
                            {date ? formatShortDate(date) : "No date set"}
                          </p>
                        ) : null}

                        {current && step.key === "interior" ? (
                          <div className="mt-5">
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {tasks.map((item) => {
                                const status = item.ready
                                  ? item.id === "progress"
                                    ? "View progress"
                                    : "Available"
                                  : "Coming soon";
                                const hint =
                                  item.id === "2d"
                                    ? "View apartment design →"
                                    : item.id === "3d"
                                      ? "Explore interior →"
                                      : item.id === "progress"
                                        ? "See dates and status →"
                                        : null;
                                const row = (
                                  <>
                                    <span className="block font-semibold text-[#f7f2e6]">
                                      {item.label}
                                    </span>
                                    <span className="block text-sm text-[#b0a070]">
                                      {status}
                                    </span>
                                    {hint ? (
                                      <span className="mt-1 block text-sm font-semibold text-[#c9a45c]">
                                        {hint}
                                      </span>
                                    ) : null}
                                  </>
                                );
                                const className =
                                  "rounded-2xl bg-[rgba(20,36,28,0.35)] px-4 py-3 text-left ring-1 ring-[rgba(232,213,163,0.12)]";
                                if (item.href && item.ready) {
                                  return (
                                    <li key={item.id}>
                                      <Link href={item.href} className={`block ${className}`}>
                                        {row}
                                      </Link>
                                    </li>
                                  );
                                }
                                if (item.action === "3d") {
                                  return (
                                    <li key={item.id}>
                                      <Link href="/#3d" className={`block ${className}`}>
                                        {row}
                                      </Link>
                                    </li>
                                  );
                                }
                                return (
                                  <li key={item.id} className={`${className} opacity-70`}>
                                    {row}
                                  </li>
                                );
                              })}
                            </ul>
                            <Link
                              href="/#interior"
                              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c]"
                            >
                              Continue interior →
                            </Link>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setOpenStep(open ? null : step.key)}
                          className="mt-4 text-sm font-semibold text-[#c9a45c]"
                        >
                          {open ? "Hide dates" : "Update dates"}
                        </button>

                        {open ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void onSaveMilestone(step.key);
                            }}
                            className="mt-4 text-[#f7f2e6]"
                          >
                            <div
                              className="grid gap-2 sm:grid-cols-2"
                              role="radiogroup"
                              aria-label={`${step.label} status`}
                            >
                              {step.options.map((opt) => {
                                const selected = step.value === opt.value;
                                return (
                                  <label key={opt.value} className="cursor-pointer">
                                    <input
                                      type="radio"
                                      name={step.key}
                                      value={opt.value}
                                      checked={selected}
                                      onChange={() =>
                                        setStatus(step.key, opt.value, step.dateKey)
                                      }
                                      className="sr-only"
                                    />
                                    <span
                                      className={`flex min-h-11 items-center justify-between border px-3 text-sm ${
                                        selected
                                          ? "border-[#c9a45c] text-[#c9a45c]"
                                          : "border-[rgba(232,213,163,0.18)] text-[#d0c090]"
                                      }`}
                                    >
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>

                            <div className="mt-4">
                              {step.key === "interior" ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <DateField
                                    label="Start date"
                                    value={form.interiorStartDate}
                                    onChange={(next) => {
                                      setForm((prev) => ({
                                        ...prev,
                                        interiorStartDate: next,
                                      }));
                                      setStepMessage((prev) => ({
                                        ...prev,
                                        interior: "",
                                      }));
                                    }}
                                  />
                                  <DateField
                                    label="Complete date"
                                    value={form.interiorDate}
                                    onChange={(next) => {
                                      setForm((prev) => ({
                                        ...prev,
                                        interiorDate: next,
                                      }));
                                      setStepMessage((prev) => ({
                                        ...prev,
                                        interior: "",
                                      }));
                                    }}
                                  />
                                </div>
                              ) : (
                                <DateField
                                  label={
                                    step.key === "registration"
                                      ? "Registration date"
                                      : step.key === "ceremony"
                                        ? "Home ceremony date"
                                        : "Move-in date"
                                  }
                                  value={form[step.dateKey]}
                                  onChange={(next) => {
                                    setForm((prev) => ({
                                      ...prev,
                                      [step.dateKey]: next,
                                    }));
                                    setStepMessage((prev) => ({
                                      ...prev,
                                      [step.key]: "",
                                    }));
                                  }}
                                />
                              )}
                            </div>

                            {stepError[step.key] ? (
                              <p
                                role="alert"
                                className="mt-4 rounded-2xl bg-[rgba(138,47,47,0.08)] px-4 py-3 text-sm text-[#8a2f2f]"
                              >
                                {stepError[step.key]}
                              </p>
                            ) : null}
                            {stepMessage[step.key] ? (
                              <p role="status" className="mt-3 text-sm text-[#c9a45c]">
                                {stepMessage[step.key]}
                              </p>
                            ) : null}
                            <button
                              type="submit"
                              disabled={saving || !dirtyStep}
                              className="mt-4 min-h-11 text-sm font-semibold text-[#c9a45c] disabled:opacity-40"
                            >
                              {saving ? "Saving…" : "Save milestone"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : panel === "stay" ? (
          <div className="space-y-5">
            <form
              onSubmit={onSaveOwner}
              className="rounded-[1.75rem] bg-[#fffcf5] p-5 text-[#14241c] shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] pb-5">
                <div>
                  <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
                    Profile
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
                    Owner
                  </h2>
                  <p className="mt-2 text-sm text-[#3d5247]">
                    Update your display name here. Phone stays linked to this
                    account ({ownerPhoneMasked}).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={ownerBusy || !ownerDirty}
                  className="min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c] disabled:opacity-45"
                >
                  {ownerBusy ? "Saving…" : "Save"}
                </button>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-[#14241c]">
                  Profile photo
                </p>
                <ProfilePhotoPicker
                  name={ownerName || flat.ownerName || flat.flatNumber}
                  photoUrl={ownerPhotoUrl}
                  flatId={flat.id}
                  kind="owner"
                  onChange={(nextUrl) => {
                    void (async () => {
                      try {
                        const supabase = createClient();
                        const { data, error: updateError } = await supabase
                          .from("flats")
                          .update({ owner_photo_url: nextUrl })
                          .eq("id", flat.id)
                          .select()
                          .single();
                        if (updateError) {
                          throw new Error(cleanError(updateError.message));
                        }
                        const owned = mapOwnedFlat(data);
                        if (owned) {
                          setFlat(owned);
                          setOwnerPhotoUrl(owned.ownerPhotoUrl);
                        } else {
                          setOwnerPhotoUrl(nextUrl);
                        }
                        setOwnerMessage(
                          nextUrl ? "Photo updated." : "Photo removed.",
                        );
                        setOwnerError("");
                      } catch (err) {
                        setOwnerError(
                          err instanceof Error
                            ? err.message
                            : "Could not update photo",
                        );
                      }
                    })();
                  }}
                />
              </div>

              <label className="mt-5 flex max-w-md flex-col gap-2 text-sm font-semibold text-[#14241c]">
                Owner name
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    setOwnerMessage("");
                    setOwnerError("");
                  }}
                  required
                  minLength={2}
                  autoComplete="name"
                  className="min-h-12 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
                />
              </label>

              {flat.ownerEmail ? (
                <p className="mt-4 max-w-md text-sm text-[#3d5247]">
                  Email{" "}
                  <a
                    href={`mailto:${flat.ownerEmail}`}
                    className="break-all font-medium text-[#14241c] underline-offset-2 hover:underline"
                  >
                    {flat.ownerEmail}
                  </a>
                </p>
              ) : null}

              {ownerError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-2xl bg-[rgba(138,47,47,0.08)] px-4 py-3 text-sm text-[#8a2f2f]"
                >
                  {ownerError}
                </p>
              ) : null}
              {ownerMessage ? (
                <p
                  role="status"
                  className="mt-4 rounded-2xl bg-[rgba(47,90,72,0.1)] px-4 py-3 text-sm font-semibold text-[#2f5a48]"
                >
                  {ownerMessage}
                </p>
              ) : null}
            </form>

            <form
              onSubmit={onSaveOccupancy}
              className="rounded-[1.75rem] bg-[#fffcf5] p-5 text-[#14241c] shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] pb-5">
                <div>
                  <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
                    Occupancy
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
                    Sale & stay
                  </h2>
                  <p className="mt-2 text-sm text-[#3d5247]">
                    Community sees sold vs unsold, owner stay vs rented, and tenant
                    name with masked phone only.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={occupancyBusy || !occupancyDirty}
                  className="min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c] disabled:opacity-45"
                >
                  {occupancyBusy ? "Saving…" : "Save"}
                </button>
              </div>

              <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                Sale status
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
                {(
                  [
                    ["sold", "Sold"],
                    ["unsold", "Unsold"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = occupancyForm.saleStatus === value;
                  return (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="saleStatus"
                        value={value}
                        checked={selected}
                        onChange={() => {
                          setOccupancyForm((prev) => ({
                            ...prev,
                            saleStatus: value,
                            occupancy:
                              value === "sold"
                                ? prev.occupancy ?? "owner_stay"
                                : null,
                            tenantName: value === "sold" ? prev.tenantName : "",
                            tenantPhone:
                              value === "sold" ? prev.tenantPhone : "",
                          }));
                          setOccupancyMessage("");
                          setOccupancyError("");
                        }}
                        className="sr-only"
                      />
                      <span
                        className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold ${
                          selected
                            ? "bg-[#1b3a2f] text-[#e8d5a3]"
                            : "bg-[rgba(27,58,47,0.05)] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]"
                        }`}
                      >
                        {label}
                        {selected ? <span aria-hidden>✓</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>

              {occupancyForm.saleStatus === "sold" ? (
                <>
                  <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                    Who lives here
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
                    {(
                      [
                        ["owner_stay", "Owner stay"],
                        ["rented", "Rented"],
                      ] as const
                    ).map(([value, label]) => {
                      const selected = occupancyForm.occupancy === value;
                      return (
                        <label key={value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="occupancy"
                            value={value}
                            checked={selected}
                            onChange={() => {
                              setOccupancyForm((prev) => ({
                                ...prev,
                                occupancy: value,
                                tenantName:
                                  value === "rented" ? prev.tenantName : "",
                                tenantPhone:
                                  value === "rented" ? prev.tenantPhone : "",
                              }));
                              setOccupancyMessage("");
                              setOccupancyError("");
                            }}
                            className="sr-only"
                          />
                          <span
                            className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold ${
                              selected
                                ? "bg-[#1b3a2f] text-[#e8d5a3]"
                                : "bg-[rgba(27,58,47,0.05)] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]"
                            }`}
                          >
                            {label}
                            {selected ? <span aria-hidden>✓</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {occupancyForm.saleStatus === "sold" &&
              occupancyForm.occupancy === "rented" ? (
                <p className="mt-4 rounded-2xl bg-[rgba(154,91,60,0.1)] px-3.5 py-3 text-sm text-[#6d3a22]">
                  Add renters with dates below. The current renter (no end
                  date) appears on the community board.
                </p>
              ) : null}

              {occupancyForm.saleStatus === "sold" ? (
                <div className="mt-6 space-y-3 border-t border-[rgba(27,58,47,0.1)] pt-5">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
                    Listings
                  </p>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[rgba(27,58,47,0.05)] px-4 ring-1 ring-[rgba(27,58,47,0.1)]">
                    <span className="text-sm font-semibold text-[#14241c]">
                      Open for rent
                    </span>
                    <input
                      type="checkbox"
                      checked={occupancyForm.openForRent}
                      onChange={(e) => {
                        setOccupancyForm((prev) => ({
                          ...prev,
                          openForRent: e.target.checked,
                        }));
                        setOccupancyMessage("");
                        setOccupancyError("");
                      }}
                      className="size-5 accent-[#1b3a2f]"
                    />
                  </label>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[rgba(27,58,47,0.05)] px-4 ring-1 ring-[rgba(27,58,47,0.1)]">
                    <span className="text-sm font-semibold text-[#14241c]">
                      Open for resale
                    </span>
                    <input
                      type="checkbox"
                      checked={occupancyForm.openForResale}
                      onChange={(e) => {
                        setOccupancyForm((prev) => ({
                          ...prev,
                          openForResale: e.target.checked,
                        }));
                        setOccupancyMessage("");
                        setOccupancyError("");
                      }}
                      className="size-5 accent-[#1b3a2f]"
                    />
                  </label>
                </div>
              ) : null}

              {occupancyError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-2xl bg-[rgba(138,47,47,0.08)] px-4 py-3 text-sm text-[#8a2f2f]"
                >
                  {occupancyError}
                </p>
              ) : null}
              {occupancyMessage ? (
                <p
                  role="status"
                  className="mt-4 rounded-2xl bg-[rgba(47,90,72,0.1)] px-4 py-3 text-sm font-semibold text-[#2f5a48]"
                >
                  {occupancyMessage}
                </p>
              ) : null}
            </form>

            <MembersEditor
              flatId={flat.id}
              initialMembers={initialMembers}
              presentation="stage"
            />

            {occupancyForm.saleStatus === "sold" &&
            occupancyForm.occupancy === "rented" ? (
              <RentersEditor
                flatId={flat.id}
                initialRenters={initialRenters}
                presentation="stage"
              />
            ) : null}
          </div>
        ) : null}

      </section>

    </div>
  );
}
