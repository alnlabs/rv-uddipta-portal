"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSaveProfile } from "@/app/actions/admin-manage";
import { ProfileDangerZone } from "@/components/ProfileDangerZone";
import {
  Button,
  Disclosure,
  FieldGrid,
  FormAlert,
  SelectField,
  TextField,
} from "@/components/form-ui";
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
    <div className="field-panel">
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
        className="mt-4"
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
        <FieldGrid>
          <SelectField
            label="Access"
            name="role"
            defaultValue={person.role}
            options={ROLE_GUIDE.map((item) => ({ value: item.value, label: item.label }))}
          />
          <TextField
            label="Flat"
            name="flatNumber"
            defaultValue={person.flatNumber || ""}
            placeholder="A101"
            hint="Needed for owner or family."
          />
          <TextField
            label="Name shown in the portal"
            name="displayName"
            defaultValue={person.displayName}
            className="sm:col-span-2"
          />
        </FieldGrid>

        {error ? (
          <div className="mt-3">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-3">
            <FormAlert tone="ok">{notice}</FormAlert>
          </div>
        ) : null}

        <Button tone="forest" disabled={pending} className="mt-4 w-full sm:w-auto">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Disclosure title="Remove this person" className="mt-4" titleClassName="text-[#8a2f2f]">
        <ProfileDangerZone userId={person.userId} email={person.email} />
      </Disclosure>
    </div>
  );
}
