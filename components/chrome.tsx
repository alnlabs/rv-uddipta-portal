import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatShortDate,
  type JourneyMark,
  type JourneyStepView,
} from "@/lib/homeDisplay";

export function PageShell({
  children,
  wide = false,
}: {
  readonly children: ReactNode
  readonly wide?: boolean
}) {
  return (
    <div className={`page-gutter py-8 md:py-12 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}

export function PageTitle({
  kicker,
  title,
  lede,
  action,
}: {
  readonly kicker?: string
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[rgba(27,58,47,0.1)] pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {kicker ? (
          <p className="text-sm text-[#7a5c22]">{kicker}</p>
        ) : null}
        <h1 className="mt-1 font-semibold tracking-tight text-[#14241c] text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
          {title}
        </h1>
        {lede ? (
          <p className="mt-3 max-w-xl text-base text-[#3d5247]">{lede}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SectionHead({
  title,
  aside,
}: {
  readonly title: string
  readonly aside?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[rgba(27,58,47,0.1)] pb-2">
      <h2 className="text-lg font-semibold tracking-tight text-[#14241c] md:text-xl">
        {title}
      </h2>
      {aside ? <div className="text-sm text-[#3d5247]">{aside}</div> : null}
    </div>
  );
}

export function MetaLine({ children }: { readonly children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-[#3d5247]">{children}</p>;
}

export function TextLink({
  href,
  children,
}: {
  readonly href: string
  readonly children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-[#1b3a2f] underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  readonly value: T
  readonly onChange: (next: T) => void
  readonly options: readonly { id: T; label: string }[]
  readonly label: string
}) {
  return (
    <div
      className="inline-flex gap-px border-b border-[rgba(27,58,47,0.14)]"
      role="tablist"
      aria-label={label}
    >
      {options.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`min-h-11 px-4 text-sm font-semibold ${
              active
                ? "border-b-2 border-[#14241c] text-[#14241c]"
                : "text-[#3d5247] hover:text-[#14241c]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Mark({ mark }: { readonly mark: JourneyMark }) {
  if (mark === "done") {
    return (
      <span
        className="grid size-6 place-items-center rounded-full bg-[#1b3a2f] text-[11px] font-bold text-[#e8d5a3]"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (mark === "active") {
    return (
      <span
        className="grid size-6 place-items-center rounded-full ring-2 ring-[#c9a45c]"
        aria-hidden
      >
        <span className="size-2 rounded-full bg-[#c9a45c]" />
      </span>
    );
  }
  return (
    <span
      className="grid size-6 place-items-center rounded-full ring-1 ring-[rgba(27,58,47,0.22)]"
      aria-hidden
    />
  );
}

export function JourneyRail({
  steps,
  href,
}: {
  readonly steps: readonly JourneyStepView[]
  readonly href?: string
}) {
  const body = (
    <ol className="divide-y divide-[rgba(27,58,47,0.08)]">
      {steps.map((step) => (
        <li key={step.key} className="flex items-center gap-4 py-3.5">
          <Mark mark={step.mark} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#14241c]">{step.label}</p>
            <p className="text-sm text-[#3d5247]">
              {step.status}
              {step.date ? ` · ${formatShortDate(step.date)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block">
      {body}
    </Link>
  );
}
