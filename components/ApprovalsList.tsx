"use client";

import { useState, useTransition } from "react";
import {
  approveRegistration,
  rejectRegistration,
} from "@/app/actions/admin";
import { Disclosure, Form, FormAlert, TextField } from "@/components/form-ui";
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
  request_kind?: "owner" | "family" | null
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
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}

      {waiting.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-[#ffffff] p-4 ring-1 ring-[rgba(15,23,42,0.12)]">
          <p className="text-lg font-semibold text-[#0f172a]">No one is waiting</p>
          <p className="mt-1 text-base text-[#475569]">
            When someone asks to join a flat, they show up here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {waiting.map((row) => (
            <li
              key={row.id}
              className="flex flex-col overflow-hidden rounded-[1.35rem] bg-[#ffffff] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)]"
            >
              <div className="bg-[#0f172a] px-4 py-4 text-[#f8fafc]">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-3xl font-semibold tracking-tight">
                    {row.flat_number}
                  </strong>
                  <span className="rounded-full bg-[#059669] px-2.5 py-1 text-[0.68rem] font-bold tracking-wide text-[#0f172a] uppercase">
                    {row.request_kind === "family" ? "Family" : "Owner"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#059669]">
                  Floor {row.floor} · {row.type}
                </p>
              </div>
              <div className="flex flex-1 flex-col p-4">
              <p className="text-lg font-semibold text-[#0f172a]">{row.owner_name}</p>
              {row.request_kind === "family" ? (
                <p className="text-sm text-[#475569]">
                  The flat’s owner can also approve this.
                </p>
              ) : (
                <p className="text-sm text-[#475569]">Only an admin can approve this.</p>
              )}
              <p className="text-base text-[#475569]">{row.email}</p>
              <p className="text-base text-[#475569]">{maskPhone(row.phone)}</p>
              <div className="mt-auto grid gap-2 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => approve(row.id)}
                  className="btn btn-gold w-full"
                >
                  Approve
                </button>
                <Form
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
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
                  <TextField
                    label="Reason"
                    name="reason"
                    required
                    minLength={3}
                    placeholder="Why this request is declined"
                    disabled={pending}
                  />
                  <button type="submit" disabled={pending} className="btn btn-danger w-full sm:w-auto">
                    Reject
                  </button>
                </Form>
              </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <Disclosure title={`Already decided (${reviewed.length})`} className="mt-8">
          <ul className="divide-y divide-[rgba(15,23,42,0.1)]">
            {reviewed.map((row) => (
              <li key={row.id} className="py-3 text-base text-[#475569]">
                <strong className="text-[#0f172a]">{row.flat_number}</strong> · {row.owner_name} ·{" "}
                {row.status === "approved" ? "Approved" : "Rejected"}
                {row.reject_reason ? ` — ${row.reject_reason}` : ""}
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}
