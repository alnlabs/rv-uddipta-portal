"use client";

import { useState, type ReactNode } from "react";

export function FormBuilder({
  heading,
  summary,
  settings,
  children,
}: {
  readonly heading: ReactNode
  readonly summary?: string
  readonly settings: ReactNode
  readonly children: ReactNode
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((next) => !next)}
            className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.14)]"
          >
            {open ? "Hide settings" : "Settings"}
          </button>
          {summary && !open ? (
            <p className="text-sm leading-relaxed text-[#3d5247]">{summary}</p>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,26rem)]">
          {settings}
        </div>
      ) : null}
      {children}
    </div>
  );
}
