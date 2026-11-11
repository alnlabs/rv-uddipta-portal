"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCreateOfficeUser } from "@/app/actions/admin-manage";
import { RoleChoice } from "@/components/RoleChoice";
import {
  Button,
  FieldGrid,
  Form,
  FormAlert,
  TextField,
} from "@/components/form-ui";
import { roleNeedsHome } from "@/lib/roleLabels";

export function RoleCreateOfficeForm({
  defaultRole = "security",
  allowAdmin = false,
}: {
  readonly defaultRole?: string
  readonly allowAdmin?: boolean
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const fallback = allowAdmin ? "admin" : "security";
  const [role, setRole] = useState(
    roleNeedsHome(defaultRole) || (!allowAdmin && defaultRole === "admin") || defaultRole === "visitor"
      ? fallback
      : defaultRole,
  );
  const [pending, startTransition] = useTransition();

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
          const result = await adminCreateOfficeUser(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice(result.message || "Saved.");
          setFormEpoch((epoch) => epoch + 1);
          router.refresh();
        });
      }}
    >
      <div className="mb-4 border-b border-[rgba(15,23,42,0.08)] pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Create staff</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Phone + PIN for Security, Facility, Staff, and other society roles. Email is optional. OTP can replace PIN later.
        </p>
      </div>

      <div className="mt-1">
        <RoleChoice kind="office" value={role} onChange={setRole} allowAdmin={allowAdmin} hideVisitor label="Type" />
      </div>

      <FieldGrid key={formEpoch} className="mt-4">
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile"
          required
        />
        <TextField
          label="PIN"
          name="pin"
          type="password"
          inputMode="numeric"
          placeholder="4–6 digits"
          required
          autoComplete="new-password"
        />
        <TextField
          label="Name"
          name="displayName"
          placeholder="Optional"
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="Optional"
          hint="Contact only. Not required for sign-in."
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
        {pending ? "Creating…" : "Create staff"}
      </Button>
    </Form>
  );
}
