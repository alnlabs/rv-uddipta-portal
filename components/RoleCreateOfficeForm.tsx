"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCreateOfficeUser } from "@/app/actions/admin-manage";
import { PeopleRolesHelp } from "@/components/PeopleRolesHelp";
import { RoleChoice } from "@/components/RoleChoice";
import {
  Button,
  FieldGrid,
  Form,
  FormAlert,
  TextField,
} from "@/components/form-ui";
import { t, type SocietyLabels } from "@/lib/labelDefaults";
import { roleNeedsHome } from "@/lib/roleLabels";

export function RoleCreateOfficeForm({
  defaultRole = "security",
  allowAdmin = false,
  labels = {},
}: {
  readonly defaultRole?: string
  readonly allowAdmin?: boolean
  readonly labels?: SocietyLabels
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-slate" onClick={() => setOpen(true)}>
          {t(labels, "create_staff")}
        </button>
        <PeopleRolesHelp labels={labels} />
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(90vh,44rem)] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] pb-3">
              <div>
                <h2 id={titleId} className="text-xl font-semibold tracking-tight text-[#0f172a]">
                  {t(labels, "create_staff")}
                </h2>
                <p className="mt-1 text-sm text-[#475569]">
                  {t(labels, "create_staff_help")}
                </p>
              </div>
              <button type="button" className="btn-line shrink-0" onClick={close}>
                {t(labels, "close")}
              </button>
            </div>

            <Form
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
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
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

              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={pending} className="w-full sm:w-auto">
                  {pending ? "Creating…" : "Create staff"}
                </Button>
                <button type="button" className="btn-line" onClick={close} disabled={pending}>
                  Cancel
                </button>
              </div>
            </Form>
          </div>
        </div>
      ) : null}
    </>
  );
}
