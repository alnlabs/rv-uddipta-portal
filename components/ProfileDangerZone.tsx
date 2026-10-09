"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResetProfile } from "@/app/actions/admin-manage";
import { Form, FormAlert } from "@/components/form-ui";

export function ProfileDangerZone({
  userId,
  email,
}: {
  readonly userId: string
  readonly email: string
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!email) return null;

  return (
    <Form
      className="mt-3 space-y-2 rounded-xl border border-[rgba(138,47,47,0.18)] bg-[#fff8f6] p-3 sm:col-span-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await adminResetProfile(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setNotice("They are now a visitor. Any flat link was removed.");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold tracking-[0.12em] text-[#8a2f2f] uppercase">
        Remove access
      </p>
      <p className="text-sm text-[#475569]">
        Turns them into a visitor and unlinks any flat. Their Google login
        still works. Type{" "}
        <code className="rounded bg-[#f8fafc] px-1">{email}</code> to confirm.
      </p>
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      {notice ? <FormAlert tone="ok">{notice}</FormAlert> : null}
      <input
        name="confirm"
        autoComplete="off"
        disabled={pending}
        placeholder={email}
        data-match={email}
        data-field="confirm"
        data-label="email"
        aria-label="Confirm email"
        className="field-control"
      />
      <button type="submit" disabled={pending} className="btn btn-danger w-full sm:w-fit">
        Remove flat access
      </button>
    </Form>
  );
}
