"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  ButtonHTMLAttributes,
  FormEvent,
  FormHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type FieldFrame = {
  label: string
  hint?: string
  error?: string
  className?: string
  tone?: "meta" | "question"
};

function FieldLabel({
  id,
  label,
  tone = "meta",
  required,
}: {
  readonly id?: string
  readonly label: string
  readonly tone?: "meta" | "question"
  readonly required?: boolean
}) {
  return (
    <span id={id} className={tone === "question" ? "field-label-question" : "field-label"}>
      {label}
      {required && tone === "question" ? <span className="field-required">Required</span> : null}
    </span>
  );
}

const FieldErrorContext = createContext<{
  errors: Record<string, string>
  clear: (name: string) => void
}>({ errors: {}, clear: () => {} });

function useFieldError(name?: string) {
  const { errors } = useContext(FieldErrorContext);
  return name ? errors[name] : undefined;
}

export function FieldMessage({ name }: { readonly name: string }) {
  const message = useFieldError(name);
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  );
}

export function WorkspaceHeader({
  kicker,
  title,
  lede,
  action,
}: {
  readonly kicker?: string
  readonly title: string
  readonly lede?: ReactNode
  readonly action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? <p className="eyebrow">{kicker}</p> : null}
        <h1 className="mt-1 text-[clamp(1.6rem,6vw,2.2rem)] font-semibold leading-none tracking-tight text-[#0f172a]">
          {title}
        </h1>
        {lede ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#475569] sm:text-base">
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function FormPanel({
  kicker,
  title,
  lede,
  action,
  children,
  className = "",
}: {
  readonly kicker?: string
  readonly title?: string
  readonly lede?: ReactNode
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <section className={`field-panel ${className}`}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] pb-3">
          <div className="min-w-0">
            {kicker ? <p className="eyebrow">{kicker}</p> : null}
            <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">
              {title}
            </h2>
            {lede ? (
              <p className="mt-1 text-sm leading-relaxed text-[#475569]">{lede}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FieldGrid({
  children,
  className = "",
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>{children}</div>;
}

export function TextField({
  label,
  hint,
  error,
  className = "",
  name,
  onChange,
  tone = "meta",
  required,
  ...props
}: FieldFrame & InputHTMLAttributes<HTMLInputElement>) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <FieldLabel label={label} tone={tone} required={required} />
      <input
        name={name}
        data-label={label}
        data-field={name}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`field-control${message ? " field-control-bad" : ""}`}
        required={required}
        onChange={(event) => {
          if (name) clear(name);
          onChange?.(event);
        }}
        {...props}
      />
      <FieldNote id={errorId} message={message} hint={hint} />
    </label>
  );
}

export type SelectOption = {
  value: string
  label: string
  hint?: string
};

export function SelectField({
  label,
  hint,
  className = "",
  name,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Choose",
  disabled,
  required,
  error,
  tone = "meta",
}: FieldFrame & {
  readonly name?: string
  readonly options: readonly SelectOption[]
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (next: string) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly required?: boolean
}) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === current);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(open, rootRef, close);

  function choose(next: string) {
    if (!controlled) setInternal(next);
    if (name) clear(name);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`flex min-w-0 flex-col gap-2 ${open ? "relative z-30" : ""} ${className}`}>
      <FieldLabel id={`${listId}-label`} label={label} tone={tone} required={required} />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
          data-label={label}
        />
      ) : null}
      <div className="relative">
      <button
        type="button"
        disabled={disabled}
        data-field={name}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={message ? errorId : undefined}
        aria-labelledby={`${listId}-label`}
        onClick={() => setOpen((next) => !next)}
        className={`field-control flex items-center justify-between gap-3 text-left font-semibold${message ? " field-control-bad" : ""}`}
      >
        <span className={selected ? "" : "font-medium text-[#8a9a90]"}>
          {selected?.label || placeholder}
        </span>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_rgba(20,36,28,0.16)] ring-1 ring-[rgba(15,23,42,0.12)]"
        >
          {options.map((option) => {
            const active = option.value === current;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(option.value)}
                  className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-base font-semibold ${
                    active
                      ? "bg-[#1e293b] text-[#f8fafc]"
                      : "text-[#0f172a] hover:bg-[rgba(15,23,42,0.05)]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      </div>
      <FieldNote id={errorId} message={message} hint={hint} />
    </div>
  );
}

export function DateField({
  label,
  hint,
  error,
  className = "",
  name,
  value,
  defaultValue = "",
  onChange,
  placeholder = "Choose a date",
  disabled,
  required,
  after,
  notBeforeToday = false,
  tone = "meta",
}: FieldFrame & {
  readonly name?: string
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (next: string) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly after?: string
  readonly notBeforeToday?: boolean
}) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"days" | "months" | "years">("days");
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const parsed = parseIso(current);
  const [cursor, setCursor] = useState(() => {
    const start = parsed ?? todayParts();
    return { y: start.y, m: start.m };
  });
  const [box, setBox] = useState({ top: 0, left: 0 });
  const today = todayParts();
  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 320;
    const height = 380;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below;
    setBox({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, close, place]);

  function commit(next: string) {
    if (!controlled) setInternal(next);
    if (name) clear(name);
    onChange?.(next);
    setOpen(false);
  }

  function show() {
    const start = parseIso(current) ?? todayParts();
    setCursor({ y: start.y, m: start.m });
    setPanel("days");
    setOpen(true);
  }

  function shiftMonth(by: number) {
    setCursor((prev) => {
      const date = new Date(prev.y, prev.m - 1 + by, 1);
      return { y: date.getFullYear(), m: date.getMonth() + 1 };
    });
  }

  const days = calendarDays(cursor.y, cursor.m);
  const yearStart = cursor.y - ((cursor.y % 12) + 12) % 12;

  const popover = open ? (
    <div
      ref={popRef}
      role="dialog"
      aria-label={label}
      style={{ top: box.top, left: box.left }}
      className="fixed z-50 w-80 rounded-2xl bg-white p-3 shadow-[0_16px_40px_rgba(20,36,28,0.16)] ring-1 ring-[rgba(15,23,42,0.12)]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={panel === "days" ? "Previous month" : "Previous years"}
          onClick={() => (panel === "days" ? shiftMonth(-1) : setCursor((prev) => ({ ...prev, y: prev.y - (panel === "years" ? 12 : 1) })))}
          className="flex size-10 items-center justify-center rounded-xl text-xl font-semibold text-[#1e293b] hover:bg-[rgba(15,23,42,0.06)]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setPanel((currentPanel) => (currentPanel === "days" ? "months" : currentPanel === "months" ? "years" : "months"))}
          className="min-h-10 rounded-xl px-3 text-base font-semibold text-[#0f172a] hover:bg-[rgba(15,23,42,0.06)]"
        >
          {panel === "years" ? `${yearStart} – ${yearStart + 11}` : panel === "months" ? cursor.y : `${MONTHS[cursor.m - 1]} ${cursor.y}`}
        </button>
        <button
          type="button"
          aria-label={panel === "days" ? "Next month" : "Next years"}
          onClick={() => (panel === "days" ? shiftMonth(1) : setCursor((prev) => ({ ...prev, y: prev.y + (panel === "years" ? 12 : 1) })))}
          className="flex size-10 items-center justify-center rounded-xl text-xl font-semibold text-[#1e293b] hover:bg-[rgba(15,23,42,0.06)]"
        >
          ›
        </button>
      </div>
      {panel === "days" ? (
        <>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#64748b]">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7">
            {days.map((day) => {
              const iso = toIso(day.y, day.m, day.d);
              const blocked = notBeforeToday && iso < toIso(today.y, today.m, today.d);
              const active = parsed?.y === day.y && parsed.m === day.m && parsed.d === day.d;
              const isToday = today.y === day.y && today.m === day.m && today.d === day.d;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={blocked}
                  onClick={() => commit(iso)}
                  className={`mx-auto flex size-10 items-center justify-center rounded-full text-sm font-semibold ${
                    active
                      ? "bg-[#1e293b] text-[#f8fafc]"
                      : blocked
                        ? "text-[#cbd5e1]"
                        : isToday
                          ? "text-[#0f172a] ring-2 ring-[#1e293b]"
                          : day.outside
                            ? "text-[#94a3b8] hover:bg-[rgba(15,23,42,0.06)]"
                            : "text-[#0f172a] hover:bg-[rgba(15,23,42,0.06)]"
                  }`}
                >
                  {day.d}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
      {panel === "months" ? (
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => (
            <button
              key={month}
              type="button"
              onClick={() => {
                setCursor((prev) => ({ ...prev, m: index + 1 }));
                setPanel("days");
              }}
              className={`min-h-11 rounded-xl text-sm font-semibold ${
                cursor.m === index + 1 ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#0f172a] hover:bg-[rgba(15,23,42,0.06)]"
              }`}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : null}
      {panel === "years" ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, index) => yearStart + index).map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setCursor((prev) => ({ ...prev, y: year }));
                setPanel("months");
              }}
              className={`min-h-11 rounded-xl text-sm font-semibold ${
                cursor.y === year ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#0f172a] hover:bg-[rgba(15,23,42,0.06)]"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}
      {panel === "days" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => commit(toIso(today.y, today.m, today.d))}
            className="btn-line flex-1"
          >
            Today
          </button>
          {required || !current ? null : (
            <button type="button" onClick={() => commit("")} className="btn-line flex-1">
              Clear
            </button>
          )}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <FieldLabel id={labelId} label={label} tone={tone} required={required} />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
          data-label={label}
          data-empty={
            /date/i.test(label)
              ? `Choose the ${label.charAt(0).toLowerCase()}${label.slice(1)}.`
              : `Choose ${label}.`
          }
          data-after={after}
        />
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        data-field={name}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={message ? errorId : undefined}
        aria-labelledby={labelId}
        onClick={() => (open ? setOpen(false) : show())}
        className={`field-control flex items-center justify-between gap-3 text-left font-semibold${message ? " field-control-bad" : ""}`}
      >
        <span className={parsed ? "" : "font-medium text-[#8a9a90]"}>
          {parsed ? formatPlain(parsed) : placeholder}
        </span>
        <CalendarMark />
      </button>
      {popover && typeof document !== "undefined" ? createPortal(popover, document.body) : null}
      <FieldNote id={errorId} message={message} hint={hint} />
    </div>
  );
}

export function Disclosure({
  title,
  children,
  className = "",
  titleClassName = "",
  defaultOpen = false,
}: {
  readonly title: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly titleClassName?: string
  readonly defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((next) => !next)}
        className={`flex min-h-12 w-full items-center justify-between gap-3 text-left text-base font-semibold ${titleClassName}`}
      >
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div id={panelId} className="pt-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { readonly open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`size-4 shrink-0 text-[#1e293b] transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

function useDismiss(
  open: boolean,
  rootRef: { readonly current: HTMLElement | null },
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef, close]);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function CalendarMark() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0 text-[#1e293b]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M3 8h14M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}

function calendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      y: date.getFullYear(),
      m: date.getMonth() + 1,
      d: date.getDate(),
      outside: date.getMonth() !== month - 1,
    };
  });
}

function todayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return { y, m, d };
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatPlain(parts: { y: number; m: number; d: number }) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(parts.y, parts.m - 1, parts.d));
}

export function TextAreaField({
  label,
  hint,
  error,
  className = "",
  name,
  onChange,
  tone = "meta",
  required,
  ...props
}: FieldFrame & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <FieldLabel label={label} tone={tone} required={required} />
      <textarea
        name={name}
        data-label={label}
        data-field={name}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`field-control${message ? " field-control-bad" : ""}`}
        required={required}
        onChange={(event) => {
          if (name) clear(name);
          onChange?.(event);
        }}
        {...props}
      />
      <FieldNote id={errorId} message={message} hint={hint} />
    </label>
  );
}

export function ChoiceField({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  layout = "grid",
  required = false,
  tone = "meta",
}: {
  readonly legend?: string
  readonly name: string
  readonly options: readonly { value: string; label: string; hint?: string }[]
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (next: string) => void
  readonly layout?: "grid" | "stack"
  readonly required?: boolean
  readonly tone?: "meta" | "question"
}) {
  const { clear } = useContext(FieldErrorContext);
  const message = useFieldError(name);
  const errorId = useId();
  const controlled = value !== undefined;
  return (
    <fieldset>
      {legend ? (
        <legend className="mb-2">
          <FieldLabel label={legend} tone={tone} required={required} />
        </legend>
      ) : null}
      <div className={layout === "stack" ? "choice-stack grid gap-2" : "grid grid-cols-2 gap-2"}>
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              data-field={name}
              data-label={legend}
              required={required}
              onChange={() => {
                clear(name);
                onChange?.(option.value);
              }}
              className="peer sr-only"
              {...(controlled
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
            />
            <span className="choice-face">
              <span className="min-w-0">
                <span className="block">{option.label}</span>
                {option.hint ? (
                  <span className="mt-0.5 block text-sm font-medium leading-snug opacity-80">
                    {option.hint}
                  </span>
                ) : null}
              </span>
            </span>
          </label>
        ))}
      </div>
      {message ? (
        <div className="mt-2">
          <FieldNote id={errorId} message={message} />
        </div>
      ) : null}
    </fieldset>
  );
}

export function SwitchField({
  label,
  hint,
  name,
  checked,
  defaultChecked,
  onChange,
  disabled,
}: {
  readonly label: string
  readonly hint?: string
  readonly name?: string
  readonly checked?: boolean
  readonly defaultChecked?: boolean
  readonly onChange?: (next: boolean) => void
  readonly disabled?: boolean
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white px-3.5 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#0f172a]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-snug text-[#475569]">{hint}</span> : null}
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          name={name}
          disabled={disabled}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
          className="peer sr-only"
          {...(checked === undefined
            ? { defaultChecked }
            : { checked })}
        />
        <span className="block h-7 w-12 rounded-full bg-[#d5cec0] transition-colors peer-checked:bg-[#1e293b] peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(15,23,42,0.16)]" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  readonly tone: "ok" | "error"
  readonly children: ReactNode
}) {
  return (
    <p
      role={tone === "ok" ? "status" : "alert"}
      className={`field-status ${tone === "ok" ? "field-status-ok" : "field-status-bad"}`}
    >
      {children}
    </p>
  );
}

export function Form({
  action,
  onSubmit,
  success,
  handled = false,
  resetOnSuccess = false,
  className = "",
  children,
  ...props
}: {
  readonly action?: (formData: FormData) => Promise<unknown> | unknown
  readonly onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  readonly success?: string
  readonly handled?: boolean
  readonly resetOnSuccess?: boolean
  readonly className?: string
  readonly children: ReactNode
} & Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit" | "className" | "children">) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const clear = useCallback((name: string) => {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);
  const context = useMemo(() => ({ errors, clear }), [errors, clear]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget;
    const found = collectFieldErrors(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setResponse(null);
      const first = Object.keys(found)[0];
      form.querySelector<HTMLElement>(`[data-field="${CSS.escape(first)}"]`)?.focus();
      return;
    }
    if (onSubmit) {
      setResponse(null);
      onSubmit(event);
      return;
    }
    if (!action || handled) {
      setResponse(null);
      return;
    }
    event.preventDefault();
    const data = new FormData(form);
    setPending(true);
    setResponse(null);
    void Promise.resolve()
      .then(() => action(data))
      .then((result) => {
        const parsed = readResponse(result);
        if (parsed?.tone === "error") {
          setResponse(parsed);
          return;
        }
        if (resetOnSuccess && form.isConnected) form.reset();
        setResponse(parsed ?? (success ? { tone: "ok", text: success } : null));
      })
      .catch((error: unknown) => {
        if (isRedirectError(error)) throw error;
        setResponse({ tone: "error", text: messageFrom(error) });
      })
      .finally(() => setPending(false));
  }

  const messages = Object.values(errors);

  return (
    <form
      noValidate
      className={className}
      action={
        handled
          ? (action as ((formData: FormData) => void | Promise<void>) | undefined)
          : undefined
      }
      onSubmit={handleSubmit}
      onChange={(event) => {
        const target = event.target;
        if (
          (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
          target.name
        ) {
          clear(target.name);
        }
      }}
      {...props}
    >
      <FieldErrorContext.Provider value={context}>
        {pending ? (
          <p role="status" className="field-status">
            Saving…
          </p>
        ) : null}
        {!pending && messages.length > 0 ? (
          <div role="alert" className="field-status field-status-bad">
            <ul className="grid gap-1">
              {messages.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {!pending && messages.length === 0 && response ? (
          <FormAlert tone={response.tone}>{response.text}</FormAlert>
        ) : null}
        {children}
      </FieldErrorContext.Provider>
    </form>
  );
}

function FieldNote({
  id,
  message,
  hint,
}: {
  readonly id: string
  readonly message?: string
  readonly hint?: string
}) {
  if (message) {
    return (
      <span id={id} className="field-error" role="alert">
        {message}
      </span>
    );
  }
  if (hint) return <span className="field-hint">{hint}</span>;
  return null;
}

function spokenLabel(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const raw = (field.dataset.label || "this").replace(/[?:]+$/g, "").trim();
  return raw.charAt(0).toLowerCase() + raw.slice(1);
}

function missingMessage(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (field.dataset.empty) return field.dataset.empty;
  const label = spokenLabel(field);
  if (field instanceof HTMLSelectElement || /date/i.test(field.dataset.label || "")) {
    return `Choose the ${label}.`;
  }
  return `Fill in the ${label}.`;
}

function collectFieldErrors(form: HTMLFormElement) {
  const errors: Record<string, string> = {};
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input[name], textarea[name], select[name]",
  );
  fields.forEach((field) => {
    if (field.disabled) return;
    if (
      field instanceof HTMLInputElement &&
      (field.type === "checkbox" || field.type === "radio" || field.type === "file" || field.type === "submit")
    ) {
      return;
    }
    if (field instanceof HTMLInputElement && field.type === "hidden" && !field.required) return;
    const name = field.name;
    if (!name || errors[name]) return;
    const value = field.value.trim();
    const min = field instanceof HTMLSelectElement ? 0 : field.minLength > 0 ? field.minLength : 0;
    if (field.required && !value) {
      errors[name] = missingMessage(field);
      return;
    }
    if (value && min > 0 && value.length < min) {
      errors[name] = `The ${spokenLabel(field)} needs at least ${min} characters.`;
      return;
    }
    if (value && field instanceof HTMLInputElement && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[name] = "Enter a valid email address.";
      return;
    }
    if (value && field instanceof HTMLInputElement && field.type === "tel" && !isPhone(value)) {
      errors[name] = "Enter a 10-digit mobile number.";
      return;
    }
    const expected = field.dataset.match;
    if (expected && value.toUpperCase() !== expected.toUpperCase()) {
      errors[name] = `Type ${expected} to continue.`;
      return;
    }
    const afterName = field.dataset.after;
    if (value && afterName) {
      const other = form.elements.namedItem(afterName);
      const otherValue = other instanceof HTMLInputElement ? other.value.trim() : "";
      const otherLabel =
        other instanceof HTMLInputElement ? other.dataset.label || "the earlier date" : "the earlier date";
      if (otherValue && value < otherValue) {
        errors[name] = `The ${spokenLabel(field)} is before ${otherLabel}.`;
      }
    }
  });
  const radios = new Map<string, HTMLInputElement[]>();
  form.querySelectorAll<HTMLInputElement>("input[type='radio'][name]").forEach((field) => {
    const group = radios.get(field.name) ?? [];
    group.push(field);
    radios.set(field.name, group);
  });
  radios.forEach((group, name) => {
    if (errors[name]) return;
    if (!group.some((field) => field.required && !field.disabled)) return;
    if (group.some((field) => field.checked)) return;
    const label = group[0]?.dataset.label || "an option";
    errors[name] = `Choose ${label}.`;
  });
  return errors;
}

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const phone =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^\d{10}$/.test(phone);
}

function readResponse(result: unknown) {
  if (!result || typeof result !== "object") return null;
  const row = result as { ok?: boolean; error?: string; message?: string };
  if (row.ok === false) {
    return { tone: "error" as const, text: row.error || row.message || "Something went wrong." };
  }
  if (row.ok === true && row.message) return { tone: "ok" as const, text: row.message };
  if (typeof row.message === "string" && row.message && row.ok !== true) {
    return { tone: "error" as const, text: row.message };
  }
  return null;
}

function isRedirectError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  return String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

function messageFrom(error: unknown) {
  if (error instanceof Error && error.message && !error.message.includes("NEXT_REDIRECT")) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function Button({
  tone = "gold",
  className = "",
  type,
  ...props
}: {
  readonly tone?: "gold" | "forest" | "ghost" | "danger"
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type ?? "submit"}
      className={`btn btn-${tone} ${className}`}
      {...props}
    />
  );
}
