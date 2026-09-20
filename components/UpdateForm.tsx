"use client";

import { useState } from "react";
import StatusPills from "@/components/StatusPills";
import { cleanError } from "@/lib/auth";
import { STATUS_FIELDS, type StatusKey } from "@/lib/status";
import type { OwnedFlat } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { mapOwnedFlat } from "@/lib/flats";

type FormState = {
  ownerName: string;
  registration: string;
  interior: string;
  ceremony: string;
  moving: string;
};

export default function UpdateForm({
  ownerPhoneMasked,
  initialFlat,
}: {
  ownerPhoneMasked: string;
  initialFlat: OwnedFlat;
}) {
  const [flat, setFlat] = useState(initialFlat);
  const [form, setForm] = useState<FormState>({
    ownerName: initialFlat.ownerName,
    registration: initialFlat.registration,
    interior: initialFlat.interior,
    ceremony: initialFlat.ceremony,
    moving: initialFlat.moving,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("flats")
        .update({
          owner_name: form.ownerName,
          registration: form.registration,
          interior: form.interior,
          ceremony: form.ceremony,
          moving: form.moving,
        })
        .eq("flat_number", flat.flatNumber)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const owned = mapOwnedFlat(data);
      if (owned) setFlat(owned);
      setMessage("Status saved for your flat.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-[calc(100%-1.25rem)] py-6 md:w-[min(1100px,calc(100%-2rem))] md:py-12">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#c9a45c] uppercase">
          Signed in as {ownerPhoneMasked}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#14241c] md:text-4xl">
          Flat <span className="text-[#2f5a48]">{flat.flatNumber}</span>
        </h1>
        <p className="mt-2 text-[#3d5247]">
          Floor {flat.floor} · {flat.type}
          {flat.facing ? ` ${flat.facing}` : ""}
          {flat.areaSqft ? ` · ${flat.areaSqft} sft` : ""} · Update possession
          milestones for the owners board.
        </p>
        <div className="mt-4">
          <StatusPills flat={flat} />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="max-w-3xl rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4 shadow-xl md:p-6"
      >
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Owner name
          <input
            type="text"
            value={form.ownerName}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
            required
            className="min-h-12 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-4 py-3 text-base font-normal"
          />
        </label>

        <div className="mt-4 grid gap-4">
          {STATUS_FIELDS.map((field) => (
            <fieldset
              key={field.key}
              className="rounded-xl border border-[rgba(27,58,47,0.14)] px-4 pt-2 pb-4"
            >
              <legend className="px-1 font-semibold">{field.label}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {field.options.map((opt) => (
                  <label key={opt.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={field.key}
                      value={opt.value}
                      checked={form[field.key as StatusKey] === opt.value}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, [field.key]: opt.value }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex min-h-11 items-center rounded-full border px-3 py-2 text-sm ${
                        form[field.key as StatusKey] === opt.value
                          ? "border-[#1b3a2f] bg-[#1b3a2f] text-[#e8d5a3]"
                          : "border-[rgba(27,58,47,0.14)] bg-[#fffdf8] text-[#3d5247]"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {error ? <p className="mt-4 text-[#8a2f2f]">{error}</p> : null}
        {message ? <p className="mt-4 font-semibold text-[#2f5a48]">{message}</p> : null}

        <button
          className="mt-5 min-h-12 w-full rounded-full bg-[#c9a45c] px-5 py-3 font-semibold text-[#14241c] disabled:opacity-65 md:w-auto"
          type="submit"
          disabled={busy}
        >
          {busy ? "Saving…" : "Save status"}
        </button>
      </form>
    </section>
  );
}
