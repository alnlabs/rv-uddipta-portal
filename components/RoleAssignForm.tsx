"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAssignRole } from "@/app/actions/admin-manage";
import {
  Button,
  FieldGrid,
  Form,
  FormAlert,
  FormPanel,
  SelectField,
  TextField,
} from "@/components/form-ui";
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
  const [formEpoch, setFormEpoch] = useState(0);
  const [pending, startTransition] = useTransition();

  if (!candidates.length) {
    return (
      <FormPanel
        className="mt-5"
        title="Add owner or family"
        lede="They need to sign in first. Then you can add them here."
      >
        {null}
      </FormPanel>
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
        startTransition(async () => {
          const result = await adminAssignRole(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice("Access saved.");
          setFormEpoch((epoch) => epoch + 1);
          router.refresh();
        });
      }}
    >
      <div className="mb-4 border-b border-[rgba(27,58,47,0.08)] pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Add owner or family</h2>
        <p className="mt-1 text-sm text-[#3d5247]">
          Choose a person who has already signed in.
        </p>
      </div>

      <FieldGrid key={formEpoch}>
        <SelectField
          label="Person"
          name="userId"
          placeholder="Choose someone"
          defaultValue=""
          required
          className="sm:col-span-2"
          options={candidates.map((person) => ({
            value: person.userId,
            label: person.flatNumber ? `${person.label} · ${person.flatNumber}` : person.label,
          }))}
        />
        <SelectField
          label="Access"
          name="role"
          defaultValue={defaultRole === "family" ? "co_owner" : defaultRole}
          options={ROLE_GUIDE.filter(
            (item) =>
              item.value === "owner" || item.value === "co_owner" || item.value === "admin",
          ).map((item) => ({ value: item.value, label: item.label }))}
        />
        <TextField
          label="Flat"
          name="flatNumber"
          defaultValue={defaultFlat}
          placeholder="A101"
          hint="Needed for owner or family."
        />
        <TextField
          label="Name shown in the portal"
          name="displayName"
          placeholder="Optional"
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
        {pending ? "Saving…" : "Save"}
      </Button>
    </Form>
  );
}
