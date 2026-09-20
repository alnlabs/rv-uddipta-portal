"use client";

import { useActionState } from "react";
import { registerOwner, type RegisterState } from "@/app/actions/register";
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

  return (
    <section className="mx-auto grid w-[calc(100%-1.25rem)] place-items-start py-6 md:min-h-[70vh] md:w-[min(1100px,calc(100%-2rem))] md:place-items-center md:py-12">
      <div className="w-full max-w-lg rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4 shadow-xl md:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#c9a45c] uppercase">
          New owner
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Request access
        </h1>
        <p className="mt-3 text-[#3d5247]">
          Signed in as {email}. Pick your brochure flat (A101–B1015). An admin
          must approve you before you can see owner information.
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Mobile number
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              className="min-h-12 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-4 py-3 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Owner name
            <input
              name="ownerName"
              type="text"
              defaultValue={defaultName}
              required
              minLength={2}
              className="min-h-12 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-4 py-3 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Flat number
            <input
              name="flatNumber"
              type="text"
              list="brochure-flats"
              autoCapitalize="characters"
              placeholder="A101 or B1004"
              required
              className="min-h-12 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-4 py-3 text-base font-normal uppercase"
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

          {state.message ? (
            <p className={state.ok ? "font-semibold text-[#2f5a48]" : "text-[#8a2f2f]"}>
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
