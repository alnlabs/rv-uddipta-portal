"use client";

import { useEffect } from "react";
import {
  formatShortDate,
  journeyExplain,
  type JourneyStepView,
} from "@/lib/homeDisplay";

function Mark({ mark }: { readonly mark: JourneyStepView["mark"] }) {
  if (mark === "done") {
    return (
      <span className="grid size-6 place-items-center rounded-full bg-[#1e293b] text-[11px] font-bold text-[#f8fafc]">
        ✓
      </span>
    );
  }
  if (mark === "active") {
    return (
      <span className="grid size-6 place-items-center rounded-full ring-2 ring-[#059669]">
        <span className="size-2 rounded-full bg-[#059669]" />
      </span>
    );
  }
  return (
    <span className="grid size-6 place-items-center rounded-full ring-1 ring-[rgba(15,23,42,0.22)]" />
  );
}

export function JourneyDetail({
  steps,
  onClose,
  onViewCurrent,
}: {
  readonly steps: readonly JourneyStepView[]
  readonly onClose: () => void
  readonly onViewCurrent?: () => void
}) {
  const current = steps.find((step) => step.mark === "active");
  const complete = steps.every((step) => step.mark === "done");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1a14]/45 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="journey-title"
        className="max-h-[min(88dvh,36rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-[#ffffff] p-5 text-[#0f172a] shadow-[0_24px_80px_rgba(0,0,0,0.28)] ring-1 ring-[rgba(15,23,42,0.12)] md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="journey-title"
              className="text-2xl font-semibold tracking-tight"
            >
              Home journey
            </h2>
            <p className="mt-1 text-sm text-[#475569]">
              {complete
                ? "Journey completed"
                : `${steps.filter((step) => step.mark === "done").length} of ${steps.length} milestones completed`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close journey"
            className="grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
          >
            ×
          </button>
        </div>

        <ol className="mt-6">
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            return (
              <li
                key={step.key}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3"
              >
                <div className="flex flex-col items-center">
                  <Mark mark={step.mark} />
                  {last ? null : (
                    <span
                      className={`mt-1 min-h-6 w-px flex-1 ${
                        step.mark === "done"
                          ? "bg-[#1e293b]"
                          : "bg-[rgba(15,23,42,0.14)]"
                      }`}
                    />
                  )}
                </div>
                <div className={`min-w-0 ${last ? "pb-0" : "pb-5"}`}>
                  <p className="font-semibold">{step.label}</p>
                  <p className="text-sm text-[#475569]">
                    {step.status}
                    {step.date ? ` · ${formatShortDate(step.date)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-[#475569]">
                    {journeyExplain(step.key, step.value)}
                  </p>
                  {current?.key === step.key && step.key === "interior" && onViewCurrent ? (
                    <button
                      type="button"
                      onClick={onViewCurrent}
                      className="mt-3 text-sm font-semibold text-[#1e293b] underline-offset-4 hover:underline"
                    >
                      View interior →
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
