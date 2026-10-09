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
  TextField,
} from "@/components/form-ui";
import { RoleChoice } from "@/components/RoleChoice";
import { accessSummary, roleNeedsHome } from "@/lib/roleLabels";

export type RolePerson = {
  userId: string
  role: string
  displayName: string
  email: string
  locked: boolean
  flatNumber: string | null
};

export function RolePersonEditor({
  person,
  kind,
}: {
  readonly person: RolePerson
  readonly kind: "office" | "home"
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [role, setRole] = useState(
    kind === "home"
      ? roleNeedsHome(person.role)
        ? person.role
        : "owner"
      : roleNeedsHome(person.role)
        ? "visitor"
        : person.role,
  );
  const [pending, startTransition] = useTransition();
  const needsHome = kind === "home" && roleNeedsHome(role);

  return (
    <div className="field-panel">
      <p className="text-base font-semibold text-[#0f172a]">
        {person.displayName || person.email || "Unnamed account"}
        {person.locked ? (
          <span className="ml-2 rounded-full bg-[#1e293b] px-2 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-[#f8fafc] uppercase">
            Super admin
          </span>
        ) : null}
      </p>
      {person.email ? (
        <p className="mt-0.5 text-sm text-[#475569]">{person.email}</p>
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
          if (kind === "office" || !roleNeedsHome(String(formData.get("role") || ""))) {
            formData.set("flatNumber", "");
          }
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
        <RoleChoice kind={kind} value={role} onChange={setRole} />
        <FieldGrid className="mt-4">
          {needsHome ? (
            <TextField
              label="Home"
              name="flatNumber"
              defaultValue={person.flatNumber || ""}
              placeholder="B804"
              required
              hint={
                role === "co_owner"
                  ? "The owner’s home."
                  : role === "tenant"
                    ? "The home they live in."
                    : "The home they own."
              }
            />
          ) : (
            <p className="text-sm text-[#475569] sm:col-span-2">This role is not tied to a home.</p>
          )}
          <TextField
            label="Name"
            name="displayName"
            defaultValue={person.displayName}
            hint="How neighbours see them."
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
