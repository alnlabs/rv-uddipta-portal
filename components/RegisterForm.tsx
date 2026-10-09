"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { lookupSavedOwner, registerOwner, type RegisterState } from "@/app/actions/register";
import { ChoiceField, Form, FormAlert, TextField } from "@/components/form-ui";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { INVENTORY } from "@/lib/inventory";
import { normalizePhone } from "@/lib/phone";

const initial: RegisterState = { ok: false, message: "" };

export default function RegisterForm({
  defaultName = "",
  email,
}: {
  defaultName?: string
  email: string
}) {
  const [state, action, pending] = useActionState(registerOwner, initial);
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState(defaultName);
  const [flatNumber, setFlatNumber] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    const normalized = normalizePhone(phone);
    if (!normalized) return;
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
  }, [phone]);

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

  return (
    <section className="page-gutter grid max-w-[1100px] place-items-start py-6 md:min-h-[70vh] md:place-items-center md:py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[rgba(15,23,42,0.12)] bg-[#ffffff]/95 shadow-xl">
        <div className="bg-[#0f172a] px-5 py-5 text-[#f8fafc] md:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Request your flat
          </h1>
          <p className="mt-2 text-sm text-[#cbd5e1]">
            Signed in as {email}. After approval you land on Updates, and My
            flat shows this apartment.
          </p>
        </div>

        <Form handled action={action} className="grid gap-4 p-4 sm:p-5">
          <ChoiceField
            legend="I am"
            name="kind"
            defaultValue="owner"
            options={[
              { value: "owner", label: "The owner" },
              { value: "family", label: "Family" },
            ]}
          />
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

          {savedNote ? <FormAlert tone="ok">{savedNote}</FormAlert> : null}

          {state.message ? (
            <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
          ) : null}

          <button className="btn btn-gold w-full" type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit for approval"}
          </button>
        </Form>
      </div>
    </section>
  );
}
