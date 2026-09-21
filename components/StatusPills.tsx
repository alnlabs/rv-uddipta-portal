import type { PublicFlat } from "@/lib/types";
import { STATUS_FIELDS, STATUS_LABELS } from "@/lib/status";

function pillClass(kind: string, value: string, invert: boolean) {
  const done =
    (kind === "moving" && value === "moved_in") ||
    (kind !== "moving" && value === "completed");
  const progress = kind === "interior" && value === "in_progress";

  if (invert) {
    if (kind === "registration" && done) {
      return "bg-[#2a4a3c] text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.28)]";
    }
    if (progress) {
      return "bg-[#4a3428] text-[#f0c9a8] ring-1 ring-[rgba(201,164,92,0.35)]";
    }
    if (kind === "interior" && done) {
      return "bg-[#4a3428] text-[#f0c9a8] ring-1 ring-[rgba(201,164,92,0.35)]";
    }
    if (kind === "ceremony" && done) {
      return "bg-[#c9a45c] text-[#14241c] ring-1 ring-[rgba(232,213,163,0.4)]";
    }
    if (kind === "moving" && done) {
      return "bg-[#2f5a48] text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.28)]";
    }
    return "bg-[#1b2e26] text-[#e8d5a3] ring-1 ring-[rgba(232,213,163,0.2)]";
  }

  if (kind === "registration" && done) {
    return "bg-[#d8ebe1] text-[#103126] ring-1 ring-[rgba(47,90,72,0.28)]";
  }
  if (progress) {
    return "bg-[#f0e0d4] text-[#6d3a22] ring-1 ring-[rgba(154,91,60,0.28)]";
  }
  if (kind === "interior" && done) {
    return "bg-[#f0e0d4] text-[#6d3a22] ring-1 ring-[rgba(154,91,60,0.28)]";
  }
  if (kind === "ceremony" && done) {
    return "bg-[#f0e6d0] text-[#103126] ring-1 ring-[rgba(201,164,92,0.35)]";
  }
  if (kind === "moving" && done) {
    return "bg-[#d5e6dc] text-[#103126] ring-1 ring-[rgba(79,138,108,0.3)]";
  }
  return "bg-[#ebe6dc] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.12)]";
}

function labelFor(kind: keyof typeof STATUS_LABELS, value: string) {
  const labels = STATUS_LABELS[kind] as Record<string, string>;
  return labels[value] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function dateSuffix(kind: string, flat: PublicFlat) {
  if (kind === "interior") {
    const start = formatDate(flat.interiorStartDate);
    const done = formatDate(flat.interiorDate);
    if (start && done) return ` · ${start} → ${done}`;
    if (done) return ` · ${done}`;
    if (start) return ` · ${start}`;
    return "";
  }
  const key =
    kind === "registration"
      ? "registrationDate"
      : kind === "ceremony"
        ? "ceremonyDate"
        : kind === "moving"
          ? "movingDate"
          : null;
  if (!key) return "";
  const formatted = formatDate(flat[key]);
  return formatted ? ` · ${formatted}` : "";
}

export default function StatusPills({
  flat,
  invert = false,
}: {
  flat: PublicFlat
  invert?: boolean
}) {
  const items = STATUS_FIELDS.map((field) => ({
    kind: field.key,
    value: flat[field.key],
    dateText: dateSuffix(field.key, flat),
  }));

  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${invert ? "justify-start md:justify-end" : "justify-start"}`}
      aria-label={`Status for flat ${flat.flatNumber}`}
    >
      {items.map((item) => (
        <li
          key={item.kind}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass(item.kind, item.value, invert)}`}
        >
          {labelFor(item.kind, item.value)}
          {item.dateText}
        </li>
      ))}
    </ul>
  );
}
