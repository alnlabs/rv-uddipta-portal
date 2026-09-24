"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAssignRole } from "@/app/actions/admin-manage";
import { ROLE_GUIDE } from "@/lib/roleLabels";

export type AssignCandidate = {
  userId: string
  label: string
  flatNumber: string | null
};

export function RoleAssignForm({
  candidates,
}: {
  readonly candidates: AssignCandidate[]
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!candidates.length) {
    return (
      <div className="mt-6 rounded-2xl bg-[#14241c] p-4 text-[#f7f2e6] md:p-5">
        <h2 className="text-lg font-semibold tracking-tight">Assign access</h2>
        <p className="mt-1 text-sm text-[#d0c090]">
          Nobody from the owner list or portal registrations has signed in yet.
          After they register, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-6 rounded-2xl bg-[#14241c] p-4 text-[#f7f2e6] md:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await adminAssignRole(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice("Access saved.");
          form.reset();
          router.refresh();
        });
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Assign access</h2>
      <p className="mt-1 text-sm text-[#d0c090]">
        Only people already in the portal or in the owners / registration
        records.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold sm:col-span-2">
          Person
          <select
            name="userId"
            required
            defaultValue=""
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          >
            <option value="" disabled>
              Choose someone
            </option>
            {candidates.map((person) => (
              <option key={person.userId} value={person.userId}>
                {person.label}
                {person.flatNumber ? ` · ${person.flatNumber}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Access
          <select
            name="role"
            defaultValue="visitor"
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          >
            {ROLE_GUIDE.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Flat
          <input
            name="flatNumber"
            placeholder="A101"
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          />
          <span className="mt-1 block text-xs font-normal text-[#d0c090]">
            Required for owner, co-owner, or tenant.
          </span>
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Name shown in the portal
          <input
            name="displayName"
            placeholder="Optional"
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-[#ffc9c2]">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-[#e8d5a3]">{notice}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 rounded-full bg-[#c9a45c] px-5 text-sm font-semibold text-[#14241c] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Assign access"}
      </button>
    </form>
  );
}
