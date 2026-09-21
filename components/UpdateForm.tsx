"use client";

import { useMemo, useState } from "react";
import MembersEditor from "@/components/MembersEditor";
import RentersEditor from "@/components/RentersEditor";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { cleanError } from "@/lib/auth";
import { facingLabel, normalizeSaleFields, typeLabel } from "@/lib/flatDisplay";
import { normalizePhone } from "@/lib/phone";
import {
  STATUS_FIELDS,
  STATUS_LABELS,
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

type Panel = "journey" | "profile";

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

function shortLabel(key: StatusKey, value: string) {
  const labels = STATUS_LABELS[key] as Record<string, string>;
  return labels[value] ?? value;
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
      <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
        {label}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white px-4 py-3 text-base font-normal normal-case tracking-normal text-[#14241c] outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
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
}: {
  ownerPhoneMasked: string;
  initialFlat: OwnedFlat;
  initialMembers: FlatMember[];
  initialRenters: FlatRenter[];
}) {
  const [flat, setFlat] = useState(initialFlat);
  const [panel, setPanel] = useState<Panel>("journey");
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
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-[#c9a45c] uppercase">
              My flat · {ownerPhoneMasked}
            </p>
            <h1 className="mt-3 text-[clamp(3rem,12vw,5.5rem)] leading-[0.9] font-semibold tracking-tight text-[#f7f2e6]">
              {flat.flatNumber}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-[#e8d5a3] md:text-base">
              {savedOwnerName ? `${savedOwnerName} · ` : ""}
              Floor {flat.floor}
              {flat.wing ? ` · Wing ${flat.wing}` : ""}
              {" · "}
              {typeLabel(flat.type)}
              {flat.facing ? ` · ${facingLabel(flat.facing)}` : ""}
              {flat.areaSqft ? ` · ${flat.areaSqft.toLocaleString()} sft` : ""}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3 md:items-end">
            <div className="w-full rounded-full bg-white/10 p-1 backdrop-blur-sm">
              <div className="flex">
                {(
                  [
                    ["journey", "Journey"],
                    ["profile", "Profile"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPanel(id)}
                    className={`min-h-11 flex-1 rounded-full text-sm font-semibold transition-colors ${
                      panel === id
                        ? "bg-[#c9a45c] text-[#14241c]"
                        : "text-[#d8c898] hover:text-[#f7f2e6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#e8d5a3] uppercase">
              {panel === "journey"
                ? `${progress.doneCount} of ${progress.total} milestones done`
                : "Owner, occupancy & household"}
            </p>
          </div>
        </div>

        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[rgba(232,213,163,0.35)] to-transparent" />

        {panel === "journey" ? (
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#c9a45c] uppercase">
                  Journey
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#f7f2e6] md:text-3xl">
                  Possession milestones
                </h2>
                <p className="mt-1 text-sm text-[#e8d5a3]">
                  Each milestone saves on its own.
                </p>
              </div>
              <span className="rounded-full bg-[#c9a45c] px-3 py-1 text-xs font-bold tracking-wide text-[#14241c] uppercase">
                {progress.doneCount} / {progress.total} done
              </span>
            </div>

            {progress.steps.map((step) => {
              const dirtyStep = milestoneDirty(step.key);
              const saving = savingStep === step.key;
              return (
                <form
                  key={step.key}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSaveMilestone(step.key);
                  }}
                  className="rounded-[1.75rem] bg-[#fffcf5] p-5 text-[#14241c] shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                        {step.label}
                      </h3>
                      <p className="mt-0.5 text-sm text-[#3d5247]">
                        {shortLabel(step.key, step.value)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${
                          step.done
                            ? "bg-[#1b3a2f] text-[#e8d5a3]"
                            : "bg-[rgba(27,58,47,0.06)] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]"
                        }`}
                      >
                        {step.done ? "Complete" : "Open"}
                      </span>
                      <button
                        type="submit"
                        disabled={saving || !dirtyStep}
                        className="min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c] disabled:opacity-45"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>

                  <div
                    className="mt-4 grid gap-2 sm:grid-cols-2"
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
                            className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold transition-colors ${
                              selected
                                ? "bg-[#1b3a2f] text-[#e8d5a3]"
                                : "bg-[rgba(27,58,47,0.04)] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)] hover:bg-[rgba(27,58,47,0.07)]"
                            }`}
                          >
                            {opt.label}
                            {selected ? <span aria-hidden>✓</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-[rgba(27,58,47,0.08)] pt-4">
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
                    <p
                      role="status"
                      className="mt-4 rounded-2xl bg-[rgba(47,90,72,0.1)] px-4 py-3 text-sm font-semibold text-[#2f5a48]"
                    >
                      {stepMessage[step.key]}
                    </p>
                  ) : null}
                </form>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 space-y-5">
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
        )}

      </section>

    </div>
  );
}
