"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminReleaseFlat,
  adminUnlinkFlatUser,
  adminWipeHousehold,
} from "@/app/actions/admin-manage";

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
        <h3 className="mt-1 text-lg font-semibold text-[#14241c]">
          Precautions for {flatNumber}
        </h3>
        <p className="mt-1 text-sm text-[#3d5247]">
          Brochure inventory is never removed. Unlink keeps owner and household
          rows. Release clears owner contact and marks the unit unsold. Wipe
          only removes household/renter records.
        </p>
      </div>

      {error ? <p className="text-sm text-[#8a2f2f]">{error}</p> : null}
      {notice ? <p className="text-sm text-[#1b3a2f]">{notice}</p> : null}

      {hasLinkedUser ? (
        <form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(27,58,47,0.08)]"
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
          <p className="text-sm font-semibold text-[#14241c]">Unlink Google login</p>
          <p className="text-xs text-[#3d5247]">
            The resident can sign in with another account later. Type{" "}
            <code className="rounded bg-[#efe8d8] px-1">UNLINK</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder="UNLINK"
            className="min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-full border border-[rgba(138,47,47,0.3)] px-4 text-sm font-semibold text-[#8a2f2f] disabled:opacity-60"
          >
            Unlink account
          </button>
        </form>
      ) : null}

      {isSold ? (
        <form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(27,58,47,0.08)]"
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
          <p className="text-sm font-semibold text-[#14241c]">Release to unsold</p>
          <p className="text-xs text-[#3d5247]">
            Clears name, email, phone, and listings. Type{" "}
            <code className="rounded bg-[#efe8d8] px-1">{flatNumber}</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder={flatNumber}
            className="min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-full bg-[#8a2f2f] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Release unit
          </button>
        </form>
      ) : null}

      {household > 0 ? (
        <form
          className="space-y-2 rounded-xl bg-white/70 p-3 ring-1 ring-[rgba(27,58,47,0.08)]"
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
          <p className="text-sm font-semibold text-[#14241c]">
            Remove household records
          </p>
          <p className="text-xs text-[#3d5247]">
            {memberCount} member{memberCount === 1 ? "" : "s"}, {renterCount}{" "}
            renter{renterCount === 1 ? "" : "s"}. Type{" "}
            <code className="rounded bg-[#efe8d8] px-1">WIPE {flatNumber}</code>.
          </p>
          <input
            name="confirm"
            autoComplete="off"
            disabled={pending}
            placeholder={`WIPE ${flatNumber}`}
            className="min-h-10 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-full border border-[rgba(138,47,47,0.45)] px-4 text-sm font-semibold text-[#8a2f2f] disabled:opacity-60"
          >
            Wipe household
          </button>
        </form>
      ) : (
        <p className="text-xs text-[#3d5247]">No household or renter rows on this unit.</p>
      )}
    </div>
  );
}
