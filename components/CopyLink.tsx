"use client";

import { useState } from "react";

export function CopyLink({ href }: { readonly href: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 break-all rounded-xl bg-[#fffcf5] px-3 py-2 text-sm text-[#14241c] ring-1 ring-[rgba(27,58,47,0.12)]">
        {href}
      </code>
      <button
        type="button"
        className="btn btn-forest"
        onClick={() => {
          void navigator.clipboard.writeText(href).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
