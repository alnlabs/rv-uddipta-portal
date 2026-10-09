"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChoiceField,
  DateField,
  Form,
  FormAlert,
  SwitchField,
  TextField,
} from "@/components/form-ui";
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

  const stayPage = panel === "stay";

  return (
    <div className={stayPage ? "min-h-full bg-[#f8fafc] text-[#0f172a]" : "relative min-h-full bg-[#0f172a] text-[#f8fafc]"}>
      {stayPage ? null : (
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(5,150,105,0.22), transparent 55%), radial-gradient(ellipse 70% 60% at 90% 10%, rgba(47,90,72,0.55), transparent 50%)",
        }}
      />
      )}

      <section className={`page-gutter relative max-w-5xl ${stayPage ? "py-8 md:py-12" : "pb-24 pt-6 md:pb-16 md:pt-10"}`}>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className={`font-semibold leading-none tracking-tight ${stayPage ? "text-3xl text-[#0f172a]" : "text-[clamp(1.7rem,6vw,2.4rem)] text-[#f8fafc]"}`}>
              {panel === "journey" ? "Home journey" : "Household"}
            </h1>
            {panel === "journey" ? (
              <p className="mt-2 text-[#d0c090]">
                Your journey to move into {flat.flatNumber}
              </p>
            ) : (
              <p className="mt-2 max-w-2xl text-[#475569]">
                Who lives in {flat.flatNumber}. Say if you live here or a tenant does, then list the family.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={goHome}
            aria-label={`Close and return to ${flat.flatNumber}`}
            className={`grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none ring-1 ${
              stayPage
                ? "text-[#0f172a] ring-[rgba(15,23,42,0.16)] hover:bg-[rgba(15,23,42,0.05)]"
                : "text-[#f8fafc] ring-[rgba(226,232,240,0.28)] hover:bg-[rgba(226,232,240,0.08)]"
            }`}
          >
            ×
          </button>
        </div>

        {panel === "journey" ? (
          <div className="min-h-[calc(100dvh-12rem)]">
            <p className="text-lg font-semibold text-[#f8fafc]">
              {progress.doneCount} of {progress.total} milestones completed
            </p>
            <p className="mt-1 text-[#059669]">{journeyHeadline(
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
                            ? "bg-[#059669] text-[#0f172a]"
                            : current
                              ? "ring-2 ring-[#059669]"
                              : "ring-1 ring-[rgba(226,232,240,0.28)]"
                        }`}
                        aria-hidden
                      >
                        {mark === "done" ? "✓" : current ? "●" : ""}
                      </span>
                      {last ? null : (
                        <span
                          className={`mt-1 min-h-[2.5rem] w-px flex-1 ${
                            mark === "done"
                              ? "bg-[#059669]"
                              : "bg-[rgba(226,232,240,0.22)]"
                          }`}
                          aria-hidden
                        />
                      )}
                    </div>

                    <div className={`min-w-0 pb-8 ${current ? "pb-10" : ""} ${last ? "pb-0" : ""}`}>
                      <div
                        className={
                          current
                            ? "rounded-[1.25rem] bg-[rgba(226,232,240,0.08)] p-5 ring-1 ring-[rgba(5,150,105,0.28)]"
                            : ""
                        }
                      >
                        <h2
                          className={`font-semibold tracking-tight ${
                            current
                              ? "text-2xl text-[#f8fafc] md:text-3xl"
                              : "text-lg text-[#f8fafc]"
                          }`}
                        >
                          {step.label}
                        </h2>
                        <p className={`mt-1 ${current ? "text-[#059669]" : "text-sm text-[#94a3b8]"}`}>
                          {journeyStatusCopy(step.key, step.value)}
                          {step.key === "registration" && date
                            ? ` · ${formatShortDate(date)}`
                            : ""}
                        </p>
                        <p className={`mt-2 max-w-xl ${current ? "text-[#f8fafc]" : "text-sm text-[#d0c090]"}`}>
                          {journeyExplain(step.key, step.value)}
                        </p>

                        {step.key === "ceremony" || step.key === "moving" ? (
                          <p className="mt-3 text-sm text-[#94a3b8]">
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
                                    <span className="block font-semibold text-[#f8fafc]">
                                      {item.label}
                                    </span>
                                    <span className="block text-sm text-[#94a3b8]">
                                      {status}
                                    </span>
                                    {hint ? (
                                      <span className="mt-1 block text-sm font-semibold text-[#059669]">
                                        {hint}
                                      </span>
                                    ) : null}
                                  </>
                                );
                                const className =
                                  "rounded-2xl bg-[rgba(20,36,28,0.35)] px-4 py-3 text-left ring-1 ring-[rgba(226,232,240,0.12)]";
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
                              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#059669] px-5 text-sm font-semibold text-[#0f172a]"
                            >
                              Continue interior →
                            </Link>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setOpenStep(open ? null : step.key)}
                          className="mt-4 text-sm font-semibold text-[#059669]"
                        >
                          {open ? "Hide dates" : "Update dates"}
                        </button>

                        {open ? (
                          <Form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void onSaveMilestone(step.key);
                            }}
                            className="field-panel mt-4 text-[#0f172a]"
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
                                      className="peer sr-only"
                                    />
                                    <span className="choice-face">{opt.label}</span>
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
                              <div className="mt-4">
                                <FormAlert tone="error">{stepError[step.key]}</FormAlert>
                              </div>
                            ) : null}
                            {stepMessage[step.key] ? (
                              <div className="mt-3">
                                <FormAlert tone="ok">{stepMessage[step.key]}</FormAlert>
                              </div>
                            ) : null}
                            <button
                              type="submit"
                              disabled={saving || !dirtyStep}
                              className="btn btn-gold mt-4 w-full sm:w-fit"
                            >
                              {saving ? "Saving…" : "Save milestone"}
                            </button>
                          </Form>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : panel === "stay" ? (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Form
              onSubmit={onSaveOccupancy}
              className="field-panel text-[#0f172a]"
            >
              <div className="border-b border-[rgba(15,23,42,0.08)] pb-3">
                <h2 className="text-xl font-semibold tracking-tight">Who lives here</h2>
                <p className="mt-2 text-sm text-[#475569]">
                  Neighbours see whether you live in {flat.flatNumber} or a tenant does.
                </p>
              </div>

              <div className="mt-4">
                <ChoiceField
                  legend="This home"
                  name="saleStatus"
                  value={occupancyForm.saleStatus}
                  onChange={(value) => {
                    setOccupancyForm((prev) => ({
                      ...prev,
                      saleStatus: value === "sold" ? "sold" : "unsold",
                      occupancy:
                        value === "sold" ? prev.occupancy ?? "owner_stay" : null,
                      tenantName: value === "sold" ? prev.tenantName : "",
                      tenantPhone: value === "sold" ? prev.tenantPhone : "",
                    }));
                    setOccupancyMessage("");
                    setOccupancyError("");
                  }}
                  options={[
                    { value: "sold", label: "Sold", hint: "An owner has this home." },
                    { value: "unsold", label: "Not sold", hint: "Still with the builder." },
                  ]}
                />
              </div>

              {occupancyForm.saleStatus === "sold" ? (
                <div className="mt-4">
                  <ChoiceField
                    legend="Who lives here"
                    name="occupancy"
                    layout="stack"
                    value={occupancyForm.occupancy ?? "owner_stay"}
                    onChange={(value) => {
                      setOccupancyForm((prev) => ({
                        ...prev,
                        occupancy: value === "rented" ? "rented" : "owner_stay",
                        tenantName: value === "rented" ? prev.tenantName : "",
                        tenantPhone: value === "rented" ? prev.tenantPhone : "",
                      }));
                      setOccupancyMessage("");
                      setOccupancyError("");
                    }}
                    options={[
                      { value: "owner_stay", label: "I live here", hint: "The owner stays in this home." },
                      { value: "rented", label: "A tenant lives here", hint: "Add the tenant below." },
                    ]}
                  />
                </div>
              ) : null}

              {occupancyForm.saleStatus === "sold" ? (
                <div className="mt-4 grid gap-2 border-t border-[rgba(15,23,42,0.08)] pt-4">
                  <p className="text-sm font-semibold text-[#0f172a]">Offered to neighbours</p>
                  <SwitchField
                    label="Open for rent"
                    hint="Neighbours can see that this home can be rented."
                    checked={occupancyForm.openForRent}
                    onChange={(next) => {
                      setOccupancyForm((prev) => ({ ...prev, openForRent: next }));
                      setOccupancyMessage("");
                      setOccupancyError("");
                    }}
                  />
                  <SwitchField
                    label="Open for resale"
                    hint="Neighbours can see that this home can be bought."
                    checked={occupancyForm.openForResale}
                    onChange={(next) => {
                      setOccupancyForm((prev) => ({ ...prev, openForResale: next }));
                      setOccupancyMessage("");
                      setOccupancyError("");
                    }}
                  />
                </div>
              ) : null}

              {occupancyError ? (
                <div className="mt-4">
                  <FormAlert tone="error">{occupancyError}</FormAlert>
                </div>
              ) : null}
              {occupancyMessage ? (
                <div className="mt-4">
                  <FormAlert tone="ok">{occupancyMessage}</FormAlert>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={occupancyBusy || !occupancyDirty}
                className="btn-slate mt-4"
              >
                {occupancyBusy ? "Saving…" : "Save"}
              </button>
            </Form>

            <Form
              onSubmit={onSaveOwner}
              className="field-panel text-[#0f172a]"
            >
              <div className="border-b border-[rgba(15,23,42,0.08)] pb-3">
                <h2 className="text-xl font-semibold tracking-tight">You</h2>
                <p className="mt-2 text-sm text-[#475569]">
                  The name neighbours see. Phone stays {ownerPhoneMasked}.
                </p>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-[#0f172a]">Photo</p>
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

              <TextField
                label="Your name"
                name="ownerName"
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
                className="mt-4 max-w-md"
              />

              {flat.ownerEmail ? (
                <p className="mt-4 max-w-md text-sm text-[#475569]">
                  Email{" "}
                  <a
                    href={`mailto:${flat.ownerEmail}`}
                    className="break-all font-medium text-[#0f172a] underline-offset-2 hover:underline"
                  >
                    {flat.ownerEmail}
                  </a>
                </p>
              ) : null}

              {ownerError ? (
                <div className="mt-4">
                  <FormAlert tone="error">{ownerError}</FormAlert>
                </div>
              ) : null}
              {ownerMessage ? (
                <div className="mt-4">
                  <FormAlert tone="ok">{ownerMessage}</FormAlert>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={ownerBusy || !ownerDirty}
                className="btn-slate mt-4"
              >
                {ownerBusy ? "Saving…" : "Save name"}
              </button>
            </Form>

            <div className="grid gap-4 lg:col-span-2">
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
          </div>
        ) : null}

      </section>

    </div>
  );
}
