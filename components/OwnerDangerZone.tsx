"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminReleaseFlat,
  adminUnlinkFlatUser,
  adminWipeHousehold,
} from "@/app/actions/admin-manage";
import { Form, FormAlert } from "@/components/form-ui";

export function OwnerDangerZone({
  flatNumber,
  hasLinkedUser,
  isSold,
  memberCount,
  renterCount,
}: {
  readonly flatNumber: string
  readonly hasLinkedUser: boolean
  readonly isSold: boolean
  readonly memberCount: number
  readonly renterCount: number
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const household = memberCount + renterCount;

  function run(
    action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    formData: FormData,
    success: string,
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(success);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-[rgba(138,47,47,0.22)] bg-[#fff8f6] p-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[#8a2f2f] uppercase">
          Safe delete
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">
          Precautions for {flatNumber}
        </h3>
        <p className="mt-1 text-sm text-[#475569]">
          Brochure inventory is never removed. Unlink keeps owner and household
          rows. Release clears owner contact and marks the unit unsold. Wipe
          only removes household/renter records.
        </p>
      </div>

      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      {notice ? <FormAlert tone="ok">{notice}</FormAlert> : null}

      {hasLinkedUser ? (
        <Form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(15,23,42,0.08)]"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              adminUnlinkFlatUser,
              new FormData(event.currentTarget),
              "Google login detached. Owner details are still on this unit.",
            );
          }}
        >
          <input type="hidden" name="flatNumber" value={flatNumber} />
          <p className="text-sm font-semibold text-[#0f172a]">Unlink Google login</p>
          <p className="text-xs text-[#475569]">
            The resident can sign in with another account later. Type{" "}
            <code className="rounded bg-[#f8fafc] px-1">UNLINK</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder="UNLINK"
            data-match="UNLINK"
            data-field="confirm"
            data-label="UNLINK"
            aria-label="Confirm"
            className="field-control"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn btn-danger w-full sm:w-fit"
          >
            Unlink account
          </button>
        </Form>
      ) : null}

      {isSold ? (
        <Form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(15,23,42,0.08)]"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              adminReleaseFlat,
              new FormData(event.currentTarget),
              "Owner contact cleared. Unit is unsold; household rows were kept.",
            );
          }}
        >
          <input type="hidden" name="flatNumber" value={flatNumber} />
          <p className="text-sm font-semibold text-[#0f172a]">Release to unsold</p>
          <p className="text-xs text-[#475569]">
            Clears name, email, phone, and listings. Type{" "}
            <code className="rounded bg-[#f8fafc] px-1">{flatNumber}</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder={flatNumber}
            data-match={flatNumber}
            data-field="confirm"
            data-label={flatNumber}
            aria-label="Confirm"
            className="field-control"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn btn-danger w-full bg-[#8a2f2f] text-white sm:w-fit"
          >
            Release unit
          </button>
        </Form>
      ) : null}

      {household > 0 ? (
        <Form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(15,23,42,0.08)]"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              adminWipeHousehold,
              new FormData(event.currentTarget),
              "Household and renter rows removed. The brochure unit remains.",
            );
          }}
        >
          <input type="hidden" name="flatNumber" value={flatNumber} />
          <p className="text-sm font-semibold text-[#0f172a]">
            Remove household records
          </p>
          <p className="text-xs text-[#475569]">
            {memberCount} member{memberCount === 1 ? "" : "s"}, {renterCount}{" "}
            renter{renterCount === 1 ? "" : "s"}. Type{" "}
            <code className="rounded bg-[#f8fafc] px-1">WIPE {flatNumber}</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder={`WIPE ${flatNumber}`}
            data-match={`WIPE ${flatNumber}`}
            data-field="confirm"
            data-label={`WIPE ${flatNumber}`}
            aria-label="Confirm"
            className="field-control"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn btn-danger w-full sm:w-fit"
          >
            Wipe household
          </button>
        </Form>
      ) : (
        <p className="text-xs text-[#475569]">No household or renter rows on this unit.</p>
      )}
    </div>
  );
}
