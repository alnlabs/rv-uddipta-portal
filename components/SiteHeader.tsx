"use client";

import Link from "next/link";

/** Public (signed-out) top bar only. Signed-in owners use OwnersShell. */
export function SiteHeader({ signedIn = false }: { signedIn?: boolean; isAdmin?: boolean }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] bg-[#efe8d8]/80 px-3 py-2 backdrop-blur-md md:px-8 md:py-3"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="RV Uddiipta home">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1b3a2f] text-xs font-semibold tracking-wide text-[#e8d5a3]">
          RV
        </span>
        <span className="min-w-0 leading-tight">
          <strong className="block truncate text-sm text-[#14241c] md:text-[0.98rem]">
            RV UDDIIPTA
          </strong>
          <em className="hidden text-[0.72rem] font-medium not-italic tracking-[0.06em] text-[#3d5247] uppercase sm:block">
            Owners Portal
          </em>
        </span>
      </Link>
      {!signedIn ? (
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3]"
        >
          Sign in
        </Link>
      ) : null}
    </header>
  );
}
