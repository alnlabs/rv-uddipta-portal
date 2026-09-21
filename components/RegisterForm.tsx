"use client";

import { useActionState, useMemo, useState } from "react";
import { registerOwner, type RegisterState } from "@/app/actions/register";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { INVENTORY } from "@/lib/inventory";

const initial: RegisterState = { ok: false, message: "" };

export default function RegisterForm({
  defaultName = "",
  email,
}: {
  defaultName?: string
  email: string
}) {
  const [state, action, pending] = useActionState(registerOwner, initial);
  const [flatNumber, setFlatNumber] = useState("");

  const selected = useMemo(() => {
    const key = flatNumber.trim().toUpperCase();
    if (!key) return null;
    return INVENTORY.find((flat) => flat.flatNumber === key) ?? null;
  }, [flatNumber]);

  return (
    <section className="mx-auto grid w-[calc(100%-1.25rem)] place-items-start py-6 md:min-h-[70vh] md:w-[min(1100px,calc(100%-2rem))] md:place-items-center md:py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]/95 shadow-xl">
        <div className="bg-[#14241c] px-5 py-5 text-[#f7f2e6] md:px-6">
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            New owner
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Request access
          </h1>
          <p className="mt-2 text-sm text-[#d8c898]">
            Signed in as {email}. An admin must approve before you see the board.
          </p>
        </div>

        <form action={action} className="flex flex-col gap-4 p-5 md:p-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#14241c]">
            Mobile number
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              placeholder="10-digit mobile"
              className="min-h-12 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white/80 px-4 py-3 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#14241c]">
            Owner name
            <input
              name="ownerName"
              type="text"
              defaultValue={defaultName}
              required
              minLength={2}
              autoComplete="name"
              className="min-h-12 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white/80 px-4 py-3 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-[#14241c]">
            Flat number
            <input
              name="flatNumber"
              type="text"
              list="brochure-flats"
              autoCapitalize="characters"
              placeholder="A101 or B1004"
              required
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value.toUpperCase())}
              className="min-h-12 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white/80 px-4 py-3 text-base font-normal uppercase outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
            />
            <datalist id="brochure-flats">
              {INVENTORY.map((flat) => (
                <option
                  key={flat.flatNumber}
                  value={flat.flatNumber}
                  label={`${flat.flatNumber} · ${flat.type} ${flat.facing} · ${flat.areaSqft} sft`}
                />
              ))}
            </datalist>
          </label>

          {selected ? (
            <div className="rounded-2xl bg-[rgba(27,58,47,0.05)] px-4 py-3 text-sm text-[#3d5247]">
              <p className="font-semibold text-[#14241c]">{selected.flatNumber}</p>
              <p className="mt-0.5">
                Floor {selected.floor} · Wing {selected.wing} ·{" "}
                {typeLabel(selected.type)} · {facingLabel(selected.facing)} ·{" "}
                {selected.areaSqft.toLocaleString()} sft
              </p>
            </div>
          ) : flatNumber.trim() ? (
            <p className="text-sm text-[#9a5b3c]">
              No brochure flat matches that number yet.
            </p>
          ) : null}

          {state.message ? (
            <p
              role={state.ok ? "status" : "alert"}
              className={`rounded-xl px-3 py-2 text-sm ${
                state.ok
                  ? "bg-[rgba(47,90,72,0.1)] font-semibold text-[#2f5a48]"
                  : "bg-[rgba(138,47,47,0.08)] text-[#8a2f2f]"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <button
            className="min-h-12 rounded-full bg-[#c9a45c] px-5 py-3 font-semibold text-[#14241c] disabled:opacity-65"
            type="submit"
            disabled={pending}
          >
            {pending ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      </div>
    </section>
  );
}
