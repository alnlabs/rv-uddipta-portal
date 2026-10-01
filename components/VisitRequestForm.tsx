"use client";

import { useActionState } from "react";
import { bookVisit, type VisitState } from "@/app/actions/visit";

const initial: VisitState = { ok: false, message: "" };

export function VisitRequestForm() {
  const [state, action, pending] = useActionState(bookVisit, initial);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <label className="block text-sm font-semibold text-[#14241c]">
        Your name
        <input
          name="name"
          required
          minLength={2}
          autoComplete="name"
          className="mt-1 min-h-12 w-full rounded-2xl border border-[rgba(27,58,47,0.14)] bg-white px-4 text-base font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-[#14241c]">
        Phone
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          required
          autoComplete="tel"
          placeholder="10-digit mobile"
          className="mt-1 min-h-12 w-full rounded-2xl border border-[rgba(27,58,47,0.14)] bg-white px-4 text-base font-normal"
        />
      </label>
      <label className="block text-sm font-semibold text-[#14241c]">
        When you want to visit
        <textarea
          name="note"
          rows={3}
          placeholder="A day and a time, if you have one"
          className="mt-1 w-full rounded-2xl border border-[rgba(27,58,47,0.14)] bg-white px-4 py-3 text-base font-normal"
        />
      </label>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm font-semibold text-[#2f5a48]" : "text-sm text-[#8a2f2f]"}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-fit rounded-full bg-[#c9a45c] px-5 text-base font-semibold text-[#14241c] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Book a visit"}
      </button>
    </form>
  );
}
