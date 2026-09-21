"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResetProfile } from "@/app/actions/admin-manage";

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
    <form
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
          setNotice("Role reset to visitor. Google login was unlinked from any flat.");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold tracking-[0.12em] text-[#8a2f2f] uppercase">
        Safe delete
      </p>
      <p className="text-sm text-[#3d5247]">
        Reset portal access to visitor. Does not delete the Google account. Type{" "}
        <code className="rounded bg-[#efe8d8] px-1">{email}</code>.
      </p>
      {error ? <p className="text-sm text-[#8a2f2f]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#1b3a2f]">{notice}</p> : null}
      <input
        name="confirm"
        autoComplete="off"
        disabled={pending}
        placeholder={email}
        className="min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-full border border-[rgba(138,47,47,0.3)] px-4 text-sm font-semibold text-[#8a2f2f] disabled:opacity-60"
      >
        Reset to visitor
      </button>
    </form>
  );
}
