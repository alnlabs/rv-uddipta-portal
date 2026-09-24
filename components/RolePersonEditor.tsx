"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSaveProfile } from "@/app/actions/admin-manage";
import { ProfileDangerZone } from "@/components/ProfileDangerZone";
import { accessSummary, ROLE_GUIDE } from "@/lib/roleLabels";

export type RolePerson = {
  userId: string
  role: string
  displayName: string
  email: string
  locked: boolean
  flatNumber: string | null
};

export function RolePersonEditor({ person }: { readonly person: RolePerson }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
      <p className="text-base font-semibold text-[#14241c]">
        {person.displayName || person.email || "Unnamed account"}
        {person.locked ? (
          <span className="ml-2 rounded-full bg-[#1b3a2f] px-2 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-[#e8d5a3] uppercase">
            Super admin
          </span>
        ) : null}
      </p>
      {person.email ? (
        <p className="mt-0.5 text-sm text-[#3d5247]">{person.email}</p>
      ) : null}
      <p className="mt-1 text-sm font-medium text-[#2f5a48]">
        {accessSummary(person)}
      </p>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setNotice(null);
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await adminSaveProfile(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setNotice("Changes saved.");
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="userId" value={person.userId} />
        {person.locked ? (
          <>
            <input type="hidden" name="role" value="admin" />
            <input type="hidden" name="flatNumber" value="" />
          </>
        ) : null}

        <label className="block text-sm font-semibold text-[#14241c]">
          Access
          <select
            name={person.locked ? undefined : "role"}
            defaultValue={person.locked ? "admin" : person.role}
            disabled={person.locked}
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm font-normal text-[#14241c] disabled:opacity-60"
          >
            {ROLE_GUIDE.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-[#14241c]">
          Flat
          <input
            name={person.locked ? undefined : "flatNumber"}
            defaultValue={person.locked ? "" : person.flatNumber || ""}
            placeholder="A101"
            disabled={person.locked}
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm font-normal text-[#14241c] disabled:opacity-60"
          />
          <span className="mt-1 block text-xs font-normal text-[#3d5247]">
            {person.locked
              ? "Super admin cannot own a society flat."
              : "Required for owner, co-owner, or tenant."}
          </span>
        </label>

        <label className="block text-sm font-semibold text-[#14241c] sm:col-span-2">
          Name shown in the portal
          <input
            name="displayName"
            defaultValue={person.displayName}
            className="mt-1 min-h-11 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm font-normal text-[#14241c]"
          />
        </label>

        {error ? (
          <p className="text-sm text-[#8a2f2f] sm:col-span-2">{error}</p>
        ) : null}
        {notice ? (
          <p className="text-sm text-[#1b3a2f] sm:col-span-2">{notice}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-[#1b3a2f] px-5 text-sm font-semibold text-[#e8d5a3] disabled:opacity-60 sm:w-fit"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {person.locked ? null : (
        <ProfileDangerZone userId={person.userId} email={person.email} />
      )}
    </li>
  );
}
