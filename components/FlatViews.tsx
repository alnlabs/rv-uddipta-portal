"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { FlatPlan2D } from "@/components/FlatPlan2D";
import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import type { FlatPlanInput } from "@/lib/flatPlan";

const FlatUnit3D = dynamic(() => import("@/components/FlatUnit3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[28rem] place-items-center rounded-2xl bg-[#1b3a2f] text-sm font-semibold text-[#e8d5a3] md:h-[32rem]">
      Loading 3D unit…
    </div>
  ),
});

export type FlatViewMode = "text" | "2d" | "3d";

const MODES: { id: FlatViewMode; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "2d", label: "2D" },
  { id: "3d", label: "3D" },
];

export function FlatViews({
  flat,
  text,
  tone = "light",
  defaultMode = "text",
  onSelectUnit,
}: {
  readonly flat: FlatPlanInput
  readonly text: ReactNode
  readonly tone?: "light" | "dark"
  readonly defaultMode?: FlatViewMode
  readonly onSelectUnit?: (flatNumber: string) => void
}) {
  const [mode, setMode] = useState<FlatViewMode>(defaultMode);
  const dark = tone === "dark";

  return (
    <div>
      <div
        className={`inline-flex rounded-full p-1 ${
          dark ? "bg-white/8" : "bg-[rgba(27,58,47,0.08)]"
        }`}
        role="tablist"
        aria-label={`${flat.flatNumber} view`}
      >
        {MODES.map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(item.id)}
              className={`min-h-9 rounded-full px-3.5 text-sm font-semibold ${
                active
                  ? dark
                    ? "bg-[#c9a45c] text-[#14241c]"
                    : "bg-[#1b3a2f] text-[#e8d5a3]"
                  : dark
                    ? "text-[#d8c898]"
                    : "text-[#3d5247]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {mode === "text" ? text : null}
        {mode === "2d" ? (
          <FlatPlan2D flat={flat} onSelectUnit={onSelectUnit} />
        ) : null}
        {mode === "3d" ? <FlatUnit3D flat={flat} /> : null}
      </div>
    </div>
  );
}

export function FlatTextFacts({
  flat,
  tone = "light",
}: {
  readonly flat: FlatPlanInput
  readonly tone?: "light" | "dark"
}) {
  const label = tone === "dark" ? "text-[#b0a070]" : "text-[#3d5247]";
  const value = tone === "dark" ? "text-[#f7f2e6]" : "text-[#14241c]";

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt className={`text-xs font-semibold tracking-[0.12em] uppercase ${label}`}>
          Type
        </dt>
        <dd className={`mt-0.5 font-semibold ${value}`}>{typeLabel(flat.type)}</dd>
      </div>
      <div>
        <dt className={`text-xs font-semibold tracking-[0.12em] uppercase ${label}`}>
          Facing
        </dt>
        <dd className={`mt-0.5 font-semibold ${value}`}>
          {flat.facing ? facingLabel(flat.facing) : "—"}
        </dd>
      </div>
      <div>
        <dt className={`text-xs font-semibold tracking-[0.12em] uppercase ${label}`}>
          Floor
        </dt>
        <dd className={`mt-0.5 font-semibold ${value}`}>{flat.floor}</dd>
      </div>
      <div>
        <dt className={`text-xs font-semibold tracking-[0.12em] uppercase ${label}`}>
          Area
        </dt>
        <dd className={`mt-0.5 font-semibold ${value}`}>
          {flat.areaSqft ? `${flat.areaSqft.toLocaleString()} sft` : "—"}
        </dd>
      </div>
    </dl>
  );
}

export function FlatViewSheet({
  flat,
  title,
  eyebrow,
  text,
  onClose,
  onSelectUnit,
}: {
  readonly flat: FlatPlanInput
  readonly title: string
  readonly eyebrow?: string
  readonly text: ReactNode
  readonly onClose: () => void
  readonly onSelectUnit?: (flatNumber: string) => void
}) {
  const titleId = useId();

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1a14]/55 p-3 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(94dvh,52rem)] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-[#fffcf5] text-[#14241c] shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-[rgba(27,58,47,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] bg-[#fffcf5]/95 px-5 py-4 backdrop-blur-sm">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="mt-0.5 text-2xl font-semibold tracking-tight"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close views"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-[#3d5247] hover:bg-[rgba(27,58,47,0.06)]"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-5">
          <FlatViews flat={flat} text={text} onSelectUnit={onSelectUnit} />
        </div>
      </div>
    </div>
  );
}

export function toPlanInput(flat: {
  flatNumber: string
  wing: string
  floor: number
  unit: number
  type: string
  facing: string
  areaSqft?: number | null
}): FlatPlanInput {
  return {
    flatNumber: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    areaSqft: flat.areaSqft ?? null,
  };
}
