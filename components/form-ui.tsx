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
};

const FieldErrorContext = createContext<{
  errors: Record<string, string>
  clear: (name: string) => void
}>({ errors: {}, clear: () => {} });

function useFieldError(name?: string) {
  const { errors } = useContext(FieldErrorContext);
  return name ? errors[name] : undefined;
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
        <h1 className="mt-1 text-[clamp(1.6rem,6vw,2.2rem)] font-semibold leading-none tracking-tight text-[#14241c]">
          {title}
        </h1>
        {lede ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#3d5247] sm:text-base">
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] pb-3">
          <div className="min-w-0">
            {kicker ? <p className="eyebrow">{kicker}</p> : null}
            <h2 className="text-xl font-semibold tracking-tight text-[#14241c]">
              {title}
            </h2>
            {lede ? (
              <p className="mt-1 text-sm leading-relaxed text-[#3d5247]">{lede}</p>
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
  ...props
}: FieldFrame & InputHTMLAttributes<HTMLInputElement>) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="field-label">{label}</span>
      <input
        name={name}
        data-label={label}
        data-field={name}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`field-control${message ? " field-control-bad" : ""}`}
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
    <div ref={rootRef} className={`flex min-w-0 flex-col gap-1.5 ${open ? "relative z-30" : ""} ${className}`}>
      <span className="field-label" id={`${listId}-label`}>
        {label}
      </span>
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
          className="absolute top-full z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_rgba(20,36,28,0.16)] ring-1 ring-[rgba(27,58,47,0.12)]"
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
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : "text-[#14241c] hover:bg-[rgba(27,58,47,0.05)]"
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
}: FieldFrame & {
  readonly name?: string
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (next: string) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly required?: boolean
  readonly after?: string
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
  const labelId = useId();
  const parsed = parseIso(current);
  const close = useCallback(() => setOpen(false), []);
  const [cursor, setCursor] = useState(() => {
    const start = parsed ?? todayParts();
    return { y: start.y, m: start.m };
  });

  useDismiss(open, rootRef, close);

  function commit(next: string) {
    if (!controlled) setInternal(next);
    if (name) clear(name);
    onChange?.(next);
    setOpen(false);
  }

  function show() {
    const start = parseIso(current) ?? todayParts();
    setCursor({ y: start.y, m: start.m });
    setOpen(true);
  }

  const daysInMonth = new Date(cursor.y, cursor.m, 0).getDate();
  const lead = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = todayParts();

  return (
    <div ref={rootRef} className={`flex min-w-0 flex-col gap-1.5 ${open ? "relative z-30" : ""} ${className}`}>
      <span className="field-label" id={labelId}>
        {label}
      </span>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
          data-label={label}
          data-after={after}
        />
      ) : null}
      <div className="relative">
      <button
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
        <Chevron open={open} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute top-full left-0 z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-3 shadow-[0_16px_40px_rgba(20,36,28,0.16)] ring-1 ring-[rgba(27,58,47,0.12)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setCursor((prev) =>
                  prev.m === 1 ? { y: prev.y - 1, m: 12 } : { y: prev.y, m: prev.m - 1 },
                )
              }
              className="flex size-11 items-center justify-center rounded-xl text-xl font-semibold text-[#1b3a2f] hover:bg-[rgba(27,58,47,0.06)]"
            >
              ‹
            </button>
            <p className="text-base font-semibold text-[#14241c]">
              {MONTHS[cursor.m - 1]} {cursor.y}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setCursor((prev) =>
                  prev.m === 12 ? { y: prev.y + 1, m: 1 } : { y: prev.y, m: prev.m + 1 },
                )
              }
              className="flex size-11 items-center justify-center rounded-xl text-xl font-semibold text-[#1b3a2f] hover:bg-[rgba(27,58,47,0.06)]"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wide text-[#5a6e62] uppercase">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const active = parsed?.y === cursor.y && parsed.m === cursor.m && parsed.d === day;
              const isToday = today.y === cursor.y && today.m === cursor.m && today.d === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => commit(toIso(cursor.y, cursor.m, day))}
                  className={`flex min-h-11 items-center justify-center rounded-xl text-base font-semibold ${
                    active
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : isToday
                        ? "bg-[rgba(201,164,92,0.28)] text-[#14241c]"
                        : "text-[#14241c] hover:bg-[rgba(27,58,47,0.06)]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => commit(toIso(today.y, today.m, today.d))}
              className="btn btn-ghost min-h-11 ring-1 ring-[rgba(27,58,47,0.12)]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => commit("")}
              disabled={!current}
              className="btn btn-danger min-h-11"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
      </div>
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
      className={`size-4 shrink-0 text-[#1b3a2f] transition-transform ${open ? "rotate-180" : ""}`}
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

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
  ...props
}: FieldFrame & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { clear } = useContext(FieldErrorContext);
  const formError = useFieldError(name);
  const message = error || formError;
  const errorId = useId();
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="field-label">{label}</span>
      <textarea
        name={name}
        data-label={label}
        data-field={name}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        className={`field-control${message ? " field-control-bad" : ""}`}
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
}: {
  readonly legend?: string
  readonly name: string
  readonly options: readonly { value: string; label: string }[]
  readonly value?: string
  readonly defaultValue?: string
  readonly onChange?: (next: string) => void
}) {
  const controlled = value !== undefined;
  return (
    <fieldset>
      {legend ? <legend className="field-label mb-2">{legend}</legend> : null}
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              onChange={onChange ? () => onChange(option.value) : undefined}
              className="peer sr-only"
              {...(controlled
                ? { checked: value === option.value }
                : { defaultChecked: defaultValue === option.value })}
            />
            <span className="choice-face">{option.label}</span>
          </label>
        ))}
      </div>
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
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[rgba(27,58,47,0.12)] bg-white px-3.5 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#14241c]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-snug text-[#3d5247]">{hint}</span> : null}
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
        <span className="block h-7 w-12 rounded-full bg-[#d5cec0] transition-colors peer-checked:bg-[#1b3a2f] peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,58,47,0.16)]" />
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

function collectFieldErrors(form: HTMLFormElement) {
  const errors: Record<string, string> = {};
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]");
  fields.forEach((field) => {
    if (field.disabled) return;
    if (field.type === "checkbox" || field.type === "radio" || field.type === "file" || field.type === "submit") {
      return;
    }
    if (field.type === "hidden" && !field.required) return;
    const name = field.name;
    if (!name || errors[name]) return;
    const label = field.dataset.label || "This field";
    const value = field.value.trim();
    const min = field.minLength > 0 ? field.minLength : 0;
    if (field.required && !value) {
      errors[name] = field.type === "hidden" ? `Choose ${label}.` : `Enter ${label}.`;
      return;
    }
    if (value && min > 0 && value.length < min) {
      errors[name] = `${label} needs at least ${min} characters.`;
      return;
    }
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[name] = "Enter a valid email address.";
      return;
    }
    if (value && field.type === "tel" && !isPhone(value)) {
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
        errors[name] = `${label} is before ${otherLabel}.`;
      }
    }
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
