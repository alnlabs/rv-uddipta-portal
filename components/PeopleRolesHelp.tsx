"use client";

import { useEffect, useId, useState } from "react";
import { t, type SocietyLabels } from "@/lib/labelDefaults";
import { PEOPLE_ROLE_GUIDE } from "@/lib/roleLabels";

export function PeopleRolesHelp({ labels = {} }: { readonly labels?: SocietyLabels }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t(labels, "who_does_what")}
        title={t(labels, "who_does_what")}
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-full text-sm font-bold text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)] hover:bg-[rgba(15,23,42,0.04)]"
      >
        ?
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.45)] p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(82vh,40rem)] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-xl font-semibold text-[#0f172a]">
                  {t(labels, "who_does_what")}
                </h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  {t(labels, "help_who_does_what")}
                </p>
              </div>
              <button type="button" className="btn-line" onClick={() => setOpen(false)}>
                {t(labels, "close")}
              </button>
            </div>
            <ul className="mt-4 grid max-h-[min(60vh,28rem)] gap-2 overflow-y-auto overscroll-contain pr-1">
              {PEOPLE_ROLE_GUIDE.map((item) => (
                <li key={item.title} className="rounded-xl bg-[#f8fafc] px-3 py-2.5 ring-1 ring-[rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[#b45309]">Works with: {item.reportsTo}</p>
                  <p className="mt-0.5 text-xs leading-snug text-[#475569]">{item.tasks}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
