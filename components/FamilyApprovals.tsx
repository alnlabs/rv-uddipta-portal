"use client";

import { useState, useTransition } from "react";
import { approveFamilyAsOwner } from "@/app/actions/admin";
import { FormAlert } from "@/components/form-ui";

export function FamilyApprovals({
  requests,
}: {
  requests: { id: number; owner_name: string; phone: string }[]
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const waiting = requests.filter((row) => !done.includes(row.id));
  if (!waiting.length && !error) return null;

  return (
    <section className="page-gutter max-w-3xl pt-4">
      <h2 className="text-xl font-semibold tracking-tight text-[#14241c]">
        Family waiting for you
      </h2>
      <p className="mt-1 text-sm text-[#3d5247]">Approve a family member for your flat.</p>
      {error ? (
        <div className="mt-3">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {waiting.map((row) => (
          <li
            key={row.id}
            className="field-panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-base text-[#14241c]">
              <strong>{row.owner_name}</strong>
              <span className="mt-0.5 block text-sm text-[#3d5247]">{row.phone}</span>
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await approveFamilyAsOwner(row.id);
                  if (!result.ok) setError(result.error);
                  else setDone((current) => [...current, row.id]);
                });
              }}
              className="btn btn-gold w-full sm:w-auto"
            >
              Approve
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
