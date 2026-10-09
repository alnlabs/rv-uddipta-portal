"use client";

import Link from "next/link";
import { Mark } from "@/components/Mark";

/** Public (signed-out) top bar only. Signed-in owners use OwnersShell. */
export function SiteHeader({ signedIn = false }: { signedIn?: boolean; isAdmin?: boolean }) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] bg-[#f8fafc]/80 px-3 py-2 backdrop-blur-md md:px-8 md:py-3"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="RV Uddiipta home">
        <Mark size={36} />
        <span className="min-w-0 leading-tight">
          <strong className="block truncate text-sm text-[#0f172a] md:text-[0.98rem]">
            RV UDDIIPTA
          </strong>
          <em className="hidden text-[0.72rem] font-medium not-italic tracking-[0.06em] text-[#475569] uppercase sm:block">
            Owners Portal
          </em>
        </span>
      </Link>
      {!signedIn ? (
        <Link
          href="/login"
          className="inline-flex min-h-14 items-center rounded-full bg-[#1e293b] px-6 text-lg font-semibold text-[#f8fafc]"
        >
          Sign in
        </Link>
      ) : null}
    </header>
  );
}
