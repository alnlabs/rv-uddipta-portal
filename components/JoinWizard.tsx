"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  chooseBrowse,
  lookupSavedOwner,
  registerJoin,
  type RegisterState,
} from "@/app/actions/register";
import { ChoiceField, Form, FormAlert, TextAreaField, TextField } from "@/components/form-ui";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { INVENTORY } from "@/lib/inventory";
import {
  HOME_KIND_OPTIONS,
  JOIN_PATH_OPTIONS,
  WORK_KIND_OPTIONS,
  type HomeJoinKind,
  type JoinPath,
  type WorkJoinKind,
} from "@/lib/join";
import { normalizePhone } from "@/lib/phone";

const initial: RegisterState = { ok: false, message: "" };

export default function JoinWizard({
  defaultName = "",
  email,
  rejectedReason = "",
}: {
  defaultName?: string
  email: string
  rejectedReason?: string
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [path, setPath] = useState<JoinPath | "">("");
  const [kind, setKind] = useState<HomeJoinKind | WorkJoinKind | "">("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState(defaultName);
  const [flatNumber, setFlatNumber] = useState("");
  const [whyNote, setWhyNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [browsePending, setBrowsePending] = useState(false);
  const [browseError, setBrowseError] = useState("");
  const [state, action, pending] = useActionState(registerJoin, initial);

  useEffect(() => {
    const normalized = normalizePhone(phone);
    if (!normalized || path !== "home") return;
    let cancelled = false;
    void lookupSavedOwner(normalized).then((saved) => {
      if (cancelled) return;
      if (!saved) {
        setSavedNote("");
        return;
      }
      if (saved.ownerName) setOwnerName(saved.ownerName);
      setFlatNumber(saved.flatNumber);
      setSavedNote("This number is already saved. Name and flat are filled in.");
    });
    return () => {
      cancelled = true;
    };
  }, [phone, path]);

  const selected = useMemo(() => {
    const key = flatNumber.trim().toUpperCase();
    if (!key) return null;
    return INVENTORY.find((flat) => flat.flatNumber === key) ?? null;
  }, [flatNumber]);

  const matches = useMemo(() => {
    const key = flatNumber.trim().toUpperCase();
    if (!key || selected) return [];
    return INVENTORY.filter((flat) => flat.flatNumber.includes(key)).slice(0, 8);
  }, [flatNumber, selected]);

  async function onBrowse() {
    setBrowsePending(true);
    setBrowseError("");
    try {
      await chooseBrowse();
    } catch (error) {
      // next/navigation redirect() throws; let it through
      if (
        error
        && typeof error === "object"
        && "digest" in error
        && String((error as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }
      setBrowseError(error instanceof Error ? error.message : "Could not continue.");
      setBrowsePending(false);
    }
  }

  return (
    <section className="page-gutter grid max-w-[1100px] place-items-start py-6 md:min-h-[70vh] md:place-items-center md:py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[rgba(15,23,42,0.12)] bg-[#ffffff]/95 shadow-xl">
        <div className="bg-[#0f172a] px-5 py-5 text-[#f8fafc] md:px-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#059669] uppercase">
            Step {step} of 3
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {step === 1 ? "Why are you here?" : step === 2 ? "Who are you?" : "Your details"}
          </h1>
          <p className="mt-2 text-sm text-[#cbd5e1]">
            Signed in as {email}. Home and work requests go to the office for approval.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          {rejectedReason ? (
            <FormAlert tone="error">{rejectedReason}</FormAlert>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              {JOIN_PATH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPath(option.value);
                    setKind("");
                    if (option.value === "browse") return;
                    setStep(2);
                  }}
                  className={`rounded-2xl px-4 py-4 text-left ring-1 ${
                    path === option.value
                      ? "bg-[rgba(5,150,105,0.12)] ring-[#059669]"
                      : "bg-white ring-[rgba(15,23,42,0.12)]"
                  }`}
                >
                  <p className="text-base font-semibold text-[#0f172a]">{option.label}</p>
                  <p className="mt-1 text-sm text-[#475569]">{option.help}</p>
                </button>
              ))}
              {path === "browse" ? (
                <div className="grid gap-2">
                  {browseError ? <FormAlert tone="error">{browseError}</FormAlert> : null}
                  <button
                    type="button"
                    disabled={browsePending}
                    onClick={onBrowse}
                    className="btn btn-gold w-full"
                  >
                    {browsePending ? "Opening…" : "Continue to public pages"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={() => setPath("")}
                  >
                    Back
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 && path === "home" ? (
            <div className="grid gap-3">
              <ChoiceField
                legend="I am"
                name="kind"
                layout="stack"
                value={kind}
                onChange={(next) => setKind(next as HomeJoinKind)}
                options={HOME_KIND_OPTIONS}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-gold w-full"
                  disabled={!kind}
                  onClick={() => kind && setStep(3)}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 && path === "work" ? (
            <div className="grid gap-3">
              <ChoiceField
                legend="I need access as"
                name="kind"
                layout="stack"
                value={kind}
                onChange={(next) => setKind(next as WorkJoinKind)}
                options={WORK_KIND_OPTIONS}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-gold w-full"
                  disabled={!kind}
                  onClick={() => kind && setStep(3)}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 && kind && (path === "home" || path === "work") ? (
            <Form handled action={action} className="grid gap-4">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="path" value={path} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Mobile"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (!normalizePhone(event.target.value)) setSavedNote("");
                  }}
                />
                <TextField
                  label="Your name"
                  name="ownerName"
                  type="text"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>

              {path === "home" ? (
                <>
                  <TextField
                    label="Flat number"
                    name="flatNumber"
                    type="text"
                    autoCapitalize="characters"
                    placeholder="A101 or B1004"
                    required
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value.toUpperCase())}
                    className="[&_input]:uppercase"
                  />
                  {matches.length > 0 ? (
                    <ul className="grid gap-1.5" aria-label="Matching flats">
                      {matches.map((flat) => (
                        <li key={flat.flatNumber}>
                          <button
                            type="button"
                            onClick={() => setFlatNumber(flat.flatNumber)}
                            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-white px-3 text-left ring-1 ring-[rgba(15,23,42,0.12)]"
                          >
                            <span className="text-base font-semibold text-[#0f172a]">
                              {flat.flatNumber}
                            </span>
                            <span className="text-sm text-[#475569]">
                              {typeLabel(flat.type)} · {facingLabel(flat.facing)} ·{" "}
                              {flat.areaSqft.toLocaleString()} sft
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {selected ? (
                    <div className="rounded-2xl bg-[rgba(15,23,42,0.05)] px-4 py-3 text-sm text-[#475569]">
                      <p className="font-semibold text-[#0f172a]">{selected.flatNumber}</p>
                      <p className="mt-0.5">
                        Floor {selected.floor} · Wing {selected.wing} ·{" "}
                        {typeLabel(selected.type)} · {facingLabel(selected.facing)} ·{" "}
                        {selected.areaSqft.toLocaleString()} sft
                      </p>
                    </div>
                  ) : flatNumber.trim() && matches.length === 0 ? (
                    <p className="text-sm text-[#9a5b3c]">
                      No brochure flat matches that number yet.
                    </p>
                  ) : null}
                </>
              ) : (
                <TextField
                  label="Flat number (optional)"
                  name="flatNumber"
                  type="text"
                  autoCapitalize="characters"
                  placeholder="Only if related to a unit"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value.toUpperCase())}
                  className="[&_input]:uppercase"
                />
              )}

              <TextAreaField
                label={path === "work" ? "Why / who engaged you" : "Why you need access"}
                name="whyNote"
                required
                minLength={3}
                rows={3}
                placeholder={
                  path === "work"
                    ? "Who asked you to join, and which desk you need"
                    : "Briefly say how you relate to this flat"
                }
                value={whyNote}
                onChange={(event) => setWhyNote(event.target.value)}
              />

              {savedNote ? <FormAlert tone="ok">{savedNote}</FormAlert> : null}
              {state.message ? (
                <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className="btn btn-ghost w-full" onClick={() => setStep(2)}>
                  Back
                </button>
                <button className="btn btn-gold w-full" type="submit" disabled={pending}>
                  {pending ? "Submitting…" : "Send for approval"}
                </button>
              </div>
            </Form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
