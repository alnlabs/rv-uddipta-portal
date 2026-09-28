import { facingLabel, typeLabel } from "@/lib/flatDisplay";
import { STATUS_FIELDS, type StatusKey } from "@/lib/status";

export type JourneyMark = "done" | "active" | "upcoming";

export type JourneyStepView = {
  key: StatusKey
  label: string
  value: string
  mark: JourneyMark
  status: string
  date: string | null
};

function isDone(key: StatusKey, value: string) {
  if (key === "moving") return value === "moved_in";
  return value === "completed";
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function firstName(full: string | null | undefined) {
  const part = (full || "").trim().split(/\s+/)[0];
  return part || null;
}

export function greeting(name: string | null | undefined) {
  const hour = new Date().getHours();
  const when = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const who = firstName(name);
  return who ? `${when}, ${who}` : when;
}

export function flatMeta(flat: {
  type: string
  wing?: string | null
  floor: number
  facing?: string | null
  areaSqft?: number | null
}) {
  return [
    typeLabel(flat.type),
    flat.wing ? `Wing ${flat.wing}` : null,
    `Floor ${flat.floor}`,
    flat.facing ? facingLabel(flat.facing) : null,
    flat.areaSqft ? `${flat.areaSqft.toLocaleString()} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function journeyStatusCopy(key: StatusKey, value: string) {
  if (isDone(key, value)) return "Completed";
  if (key === "interior" && value === "in_progress") return "In progress";
  if (key === "interior" && value === "not_started") return "Not started";
  if (key === "moving" && value === "pending") return "Not started";
  return "Upcoming";
}

export function journeyMark(key: StatusKey, value: string): JourneyMark {
  if (isDone(key, value)) return "done";
  if (key === "interior" && value === "in_progress") return "active";
  return "upcoming";
}

export function withCurrentMilestone(
  steps: readonly JourneyStepView[],
): JourneyStepView[] {
  const current = steps.findIndex((step) => step.mark !== "done");
  return steps.map((step, index) => ({
    ...step,
    mark: step.mark === "done" ? "done" : index === current ? "active" : "upcoming",
  }));
}

export function journeyExplain(key: StatusKey, value: string) {
  if (key === "registration") {
    return isDone(key, value)
      ? "Your apartment registration is complete."
      : "Registration is not complete yet.";
  }
  if (key === "interior") {
    if (value === "in_progress") return "Interior work is currently in progress.";
    if (isDone(key, value)) return "Interior work is complete.";
    return "Interior work has not started yet.";
  }
  if (key === "ceremony") {
    return isDone(key, value)
      ? "Your home ceremony is complete."
      : "Your home ceremony is upcoming.";
  }
  return isDone(key, value)
    ? "You have moved in."
    : "Move-in has not started yet.";
}

export function journeyHeadline(steps: readonly JourneyStepView[]) {
  const current =
    steps.find((step) => step.mark === "active") ??
    steps.find((step) => step.mark === "upcoming") ??
    steps[steps.length - 1];
  if (!current) return "";
  if (current.mark === "active") {
    return `${current.label} is currently ${current.status.toLowerCase()}`;
  }
  if (current.mark === "done") {
    return "All milestones are complete";
  }
  return `${current.label} is next`;
}

export function journeySteps(flat: {
  registration: string
  interior: string
  ceremony: string
  moving: string
  registrationDate?: string | null
  interiorStartDate?: string | null
  interiorDate?: string | null
  ceremonyDate?: string | null
  movingDate?: string | null
}): JourneyStepView[] {
  const values: Record<StatusKey, string> = {
    registration: flat.registration,
    interior: flat.interior,
    ceremony: flat.ceremony,
    moving: flat.moving,
  };
  const dates: Record<StatusKey, string | null> = {
    registration: flat.registrationDate ?? null,
    interior: flat.interiorDate ?? flat.interiorStartDate ?? null,
    ceremony: flat.ceremonyDate ?? null,
    moving: flat.movingDate ?? null,
  };
  return withCurrentMilestone(
    STATUS_FIELDS.map((field) => {
      const key = field.key as StatusKey;
      const value = values[key];
      return {
        key,
        label: field.label,
        value,
        mark: journeyMark(key, value),
        status: journeyStatusCopy(key, value),
        date: dates[key],
      };
    }),
  );
}
