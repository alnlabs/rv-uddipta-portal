"use client";

import Link from "next/link";
import { useState } from "react";

export function CopyLink({
  href,
  previewHref,
}: {
  readonly href: string
  readonly previewHref?: string
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] bg-[#14241c] px-5 py-5 text-[#f7f2e6] sm:flex-row sm:items-center md:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#e8d5a3] uppercase">
          Share this form
        </p>
        <p className="mt-2 break-all text-sm leading-relaxed text-[#f7f2e6]">{href}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => {
            void navigator.clipboard.writeText(href).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        {previewHref ? (
          <Link href={previewHref} className="btn btn-ghost text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.35)]">
            Preview
          </Link>
        ) : null}
      </div>
    </div>
  );
}
