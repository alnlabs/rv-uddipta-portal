export function indiaDay(offset = 0) {
  const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function calendarDay(value: string | null | undefined) {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

/** Day difference from today in Asia/Kolkata (positive = future). */
export function dayOffset(value: string | null | undefined) {
  const day = calendarDay(value);
  if (!day) return null;
  const today = indiaDay(0);
  const a = Date.parse(`${today}T12:00:00+05:30`);
  const b = Date.parse(`${day}T12:00:00+05:30`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function absoluteDay(value: string | null | undefined, withYear = true) {
  const day = calendarDay(value);
  if (!day) return "";
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(year, month - 1, date);
  const sameYear = day.slice(0, 4) === indiaDay(0).slice(0, 4);
  return parsed.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear && !sameYear ? { year: "numeric" as const } : {}),
  });
}

/**
 * Calendar day for people: Today / Tomorrow / Yesterday / in 3 days / 3 days ago /
 * then a short weekday date.
 */
export function planDayLabel(value: string | null | undefined) {
  const offset = dayOffset(value);
  if (offset == null) return "";
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (offset > 1 && offset <= 6) return `in ${offset} days`;
  if (offset < -1 && offset >= -6) return `${Math.abs(offset)} days ago`;
  return absoluteDay(value);
}

/** Absolute short date from a timestamp or calendar day. */
export function absoluteWhen(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) && raw.length <= 10) {
    return absoluteDay(raw);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Duration from a timestamp: just now / 5m ago / 2h ago / Yesterday / 3d ago /
 * in 2h / then absolute date.
 */
export function relativeTime(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return absoluteWhen(raw);

  const ms = parsed.getTime() - Date.now();
  const future = ms > 0;
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return future ? "in a moment" : "just now";
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`;
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;

  const dayLabel = planDayLabel(parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  if (dayLabel === "Yesterday" || dayLabel === "Tomorrow" || dayLabel === "Today") return dayLabel;
  if (days <= 6) return future ? `in ${days}d` : `${days}d ago`;
  return absoluteWhen(raw);
}

/** Prefer relative for timestamps; calendar duration for YYYY-MM-DD. */
export function whenLabel(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) && (raw.length === 10 || raw[10] === "T" || raw[10] === " ")) {
    if (raw.length === 10) return planDayLabel(raw);
  }
  return relativeTime(raw);
}
