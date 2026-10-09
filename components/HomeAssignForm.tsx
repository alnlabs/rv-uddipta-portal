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
  FormPanel,
  SelectField,
  TextField,
} from "@/components/form-ui";
import { roleNeedsHome } from "@/lib/roleLabels";
import type { AssignCandidate } from "@/components/RoleAssignForm";

export function HomeAssignForm({
  candidates,
  flatNumber,
  defaultRole = "owner",
}: {
  readonly candidates: AssignCandidate[]
  readonly flatNumber: string
  readonly defaultRole?: string
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const [role, setRole] = useState(
    defaultRole === "family" || defaultRole === "co_owner"
      ? "co_owner"
      : defaultRole === "tenant"
        ? "tenant"
        : "owner",
  );
  const [pending, startTransition] = useTransition();
  const home = flatNumber.trim().toUpperCase();

  if (!candidates.length) {
    return (
      <FormPanel
        className="mt-5"
        title={`Who can sign in at ${home || "this home"}`}
        lede="They need to sign in with Google first. Then you can place them in this home."
      >
        {null}
      </FormPanel>
    );
  }

  return (
    <Form
      className="mt-5 border-t border-[rgba(15,23,42,0.08)] pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        const formData = new FormData(event.currentTarget);
        if (home) formData.set("flatNumber", home);
        if (!roleNeedsHome(String(formData.get("role") || ""))) return;
        startTransition(async () => {
          const result = await adminAssignRole(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice("Saved for this home.");
          setFormEpoch((epoch) => epoch + 1);
          router.refresh();
        });
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight">
        {home ? `Who can sign in at ${home}` : "Who can sign in for a home"}
      </h2>
      <p className="mt-1 text-sm text-[#475569]">
        Owner, family, or tenant. Office roles stay on the Roles screen.
      </p>

      <FieldGrid key={formEpoch} className="mt-4">
        <SelectField
          label="Person"
          name="userId"
          placeholder="Choose someone who has signed in"
          defaultValue=""
          required
          className="sm:col-span-2"
          options={candidates.map((person) => ({
            value: person.userId,
            label: person.flatNumber ? `${person.label} · ${person.flatNumber}` : person.label,
          }))}
        />
        {home ? null : (
          <TextField
            label="Home"
            name="flatNumber"
            placeholder="B804"
            required
            hint="The home they belong to."
          />
        )}
        <TextField
          label="Name"
          name="displayName"
          placeholder="Optional"
          hint="How neighbours see them."
          className="sm:col-span-2"
        />
      </FieldGrid>
      {home ? <input type="hidden" name="flatNumber" value={home} /> : null}

      <div className="mt-4">
        <RoleChoice kind="home" value={role} onChange={setRole} />
      </div>

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
        {pending ? "Saving…" : "Save for this home"}
      </Button>
    </Form>
  );
}
