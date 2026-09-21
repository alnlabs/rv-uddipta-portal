"use client";

import { useState, useTransition } from "react";
import {
  approveRegistration,
  rejectRegistration,
} from "@/app/actions/admin";
import { maskPhone } from "@/lib/phone";

export type AdminRegistrationRequest = {
  id: number
  flat_number: string
  floor: number
  type: string
  owner_name: string
  email: string | null
  phone: string
  status: "pending" | "approved" | "rejected"
  reject_reason: string | null
};

type Override = {
  status: "approved" | "rejected"
  reject_reason?: string | null
};

export function ApprovalsList({
  requests,
}: {
  readonly requests: AdminRegistrationRequest[]
}) {
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [pending, startTransition] = useTransition();

  const rows = requests.map((row) => {
    const override = overrides[row.id];
    if (!override || override.status === row.status) return row;
    return { ...row, ...override };
  });
  const waiting = rows.filter((row) => row.status === "pending");
  const reviewed = rows.filter((row) => row.status !== "pending");

  function approve(id: number) {
    setError(null);
    setOverrides((current) => ({ ...current, [id]: { status: "approved" } }));
    startTransition(async () => {
      const result = await approveRegistration(id);
      if (!result.ok) {
        setOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setError(result.error);
      }
    });
  }

  function reject(id: number, reason: string) {
    setError(null);
    setOverrides((current) => ({
      ...current,
      [id]: { status: "rejected", reject_reason: reason || null },
    }));
    startTransition(async () => {
      const result = await rejectRegistration(id, reason);
      if (!result.ok) {
        setOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setError(result.error);
      }
    });
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#14241c]">Owner registrations</h2>
      <p className="mt-1 text-sm text-[#3d5247]">
        Approve a request to link that Google account to a brochure flat.
        Rejecting needs a written reason.
      </p>

      {error ? <p className="mt-4 text-[#8a2f2f]">{error}</p> : null}

      <h3 className="mt-8 text-lg font-semibold">Pending</h3>
      {waiting.length === 0 ? (
        <p className="mt-3 text-[#3d5247]">No pending requests.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {waiting.map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-xl">Flat {row.flat_number}</strong>
                <span className="text-sm text-[#3d5247]">
                  Floor {row.floor} · {row.type}
                </span>
              </div>
              <p className="mt-1">{row.owner_name}</p>
              <p className="text-sm text-[#3d5247]">{row.email || maskPhone(row.phone)}</p>
              <p className="text-sm text-[#3d5247]">{maskPhone(row.phone)}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => approve(row.id)}
                  className="min-h-12 w-full rounded-full bg-[#c9a45c] px-4 py-2 font-semibold text-[#14241c] disabled:opacity-60 sm:w-auto"
                >
                  Approve
                </button>
                <form
                  className="flex flex-1 flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const value = new FormData(event.currentTarget).get("reason");
                    const reason = typeof value === "string" ? value.trim() : "";
                    if (reason.length < 3) {
                      setError("Type a short reason before rejecting.");
                      return;
                    }
                    reject(row.id, reason);
                  }}
                >
                  <input
                    name="reason"
                    required
                    minLength={3}
                    placeholder="Reason (required)"
                    disabled={pending}
                    className="min-h-12 flex-1 rounded-xl border border-[rgba(27,58,47,0.14)] bg-[#fffdf8] px-3 py-2"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="min-h-12 rounded-full border border-[rgba(138,47,47,0.3)] px-4 py-2 font-semibold text-[#8a2f2f] disabled:opacity-60"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <>
          <h3 className="mt-10 text-lg font-semibold">Reviewed</h3>
          <ul className="mt-4 divide-y divide-[rgba(27,58,47,0.14)]">
            {reviewed.map((row) => (
              <li key={row.id} className="py-3">
                <strong>Flat {row.flat_number}</strong> · {row.owner_name} ·{" "}
                <span className="capitalize">{row.status}</span>
                {row.reject_reason ? ` — ${row.reject_reason}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
