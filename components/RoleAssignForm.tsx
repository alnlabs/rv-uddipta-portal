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
  defaultRole = "owner",
  defaultFlat = "",
}: {
  readonly candidates: AssignCandidate[]
  readonly defaultRole?: string
  readonly defaultFlat?: string
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!candidates.length) {
    return (
      <div className="mt-6 rounded-2xl bg-[#fffcf5] p-4 text-[#14241c] ring-1 ring-[rgba(27,58,47,0.12)]">
        <h2 className="text-lg font-semibold">Add owner or family</h2>
        <p className="mt-1 text-base text-[#3d5247]">
          They need to sign in first. Then you can add them here.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-6 rounded-2xl bg-[#fffcf5] p-4 text-[#14241c] ring-1 ring-[rgba(27,58,47,0.12)]"
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
      <h2 className="text-lg font-semibold">Add owner or family</h2>
      <p className="mt-1 text-base text-[#3d5247]">
        Choose a person who has already signed in.
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
            defaultValue={defaultRole === "family" ? "co_owner" : defaultRole}
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          >
            {ROLE_GUIDE.filter((item) =>
              item.value === "owner" || item.value === "co_owner" || item.value === "admin",
            ).map((item) => (
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
            defaultValue={defaultFlat}
            placeholder="A101"
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(232,213,163,0.2)] bg-[#fffcf5] px-3 font-normal text-[#14241c]"
          />
          <span className="mt-1 block text-sm font-normal text-[#3d5247]">
            Needed for owner or family.
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

      {error ? <p className="mt-3 text-base text-[#8a2f2f]">{error}</p> : null}
      {notice ? <p className="mt-3 text-base text-[#1b3a2f]">{notice}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-12 rounded-full bg-[#c9a45c] px-5 text-base font-semibold text-[#14241c] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
