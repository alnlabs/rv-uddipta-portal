"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAssignRole } from "@/app/actions/admin-manage";
import { RoleChoice } from "@/components/RoleChoice";
import {
  Button,
  FieldGrid,
  Form,
  FormAlert,
  SelectField,
  TextField,
} from "@/components/form-ui";
import { roleNeedsHome } from "@/lib/roleLabels";

export type AssignCandidate = {
  userId: string
  label: string
  flatNumber: string | null
};

export function RoleAssignForm({
  candidates,
  defaultRole = "admin",
}: {
  readonly candidates: AssignCandidate[]
  readonly defaultRole?: string
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const [role, setRole] = useState(roleNeedsHome(defaultRole) ? "admin" : defaultRole);
  const [pending, startTransition] = useTransition();

  if (!candidates.length) {
    return (
      <p className="mt-5 text-sm text-[#475569]">
        No one else has signed in yet. They need a Google sign-in before you can give them an office role.
      </p>
    );
  }

  return (
    <Form
      className="field-panel mt-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        const form = event.currentTarget;
        const formData = new FormData(form);
        formData.set("flatNumber", "");
        startTransition(async () => {
          const result = await adminAssignRole(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice("Saved.");
          setFormEpoch((epoch) => epoch + 1);
          router.refresh();
        });
      }}
    >
      <div className="mb-4 border-b border-[rgba(15,23,42,0.08)] pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Give an office role</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Choose someone who has signed in. Their home stays with them. This sets the office role they use.
        </p>
      </div>

      <FieldGrid key={formEpoch}>
        <SelectField
          label="Person"
          name="userId"
          placeholder="Choose someone who has signed in"
          defaultValue=""
          required
          className="sm:col-span-2"
          options={candidates.map((person) => ({
            value: person.userId,
            label: person.label,
          }))}
        />
      </FieldGrid>

      <div className="mt-4">
        <RoleChoice kind="office" value={role} onChange={setRole} />
      </div>

      <FieldGrid className="mt-4">
        <TextField
          label="Name"
          name="displayName"
          placeholder="Optional"
          hint="Leave blank to keep their sign-in name."
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

      <Button disabled={pending} className="mt-4 w-full sm:w-auto">
        {pending ? "Saving…" : "Save office role"}
      </Button>
    </Form>
  );
}
