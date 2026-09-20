import type { PublicFlat } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/status";

function pillClass(kind: string, value: string) {
  const done =
    (kind === "moving" && value === "moved_in") ||
    (kind !== "moving" && value === "completed");
  const progress = kind === "interior" && value === "in_progress";
  if (kind === "registration" && done) return "bg-[rgba(47,90,72,0.18)] text-[#103126]";
  if (progress) return "bg-[rgba(154,91,60,0.16)] text-[#6d3a22]";
  if (kind === "interior" && done) return "bg-[rgba(154,91,60,0.2)] text-[#103126]";
  if (kind === "ceremony" && done) return "bg-[rgba(201,164,92,0.24)] text-[#103126]";
  if (kind === "moving" && done) return "bg-[rgba(79,138,108,0.22)] text-[#103126]";
  return "bg-[rgba(27,58,47,0.06)] text-[#3d5247]";
}

function labelFor(kind: keyof typeof STATUS_LABELS, value: string) {
  const labels = STATUS_LABELS[kind] as Record<string, string>;
  return labels[value] ?? value;
}

export default function StatusPills({ flat }: { flat: PublicFlat }) {
  const items: { kind: keyof typeof STATUS_LABELS; value: string }[] = [
    { kind: "registration", value: flat.registration },
    { kind: "interior", value: flat.interior },
    { kind: "ceremony", value: flat.ceremony },
    { kind: "moving", value: flat.moving },
  ];

  return (
    <ul className="flex flex-wrap justify-start gap-1.5 md:justify-end" aria-label={`Status for flat ${flat.flatNumber}`}>
      {items.map((item) => (
        <li
          key={item.kind}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass(item.kind, item.value)}`}
        >
          {labelFor(item.kind, item.value)}
        </li>
      ))}
    </ul>
  );
}
