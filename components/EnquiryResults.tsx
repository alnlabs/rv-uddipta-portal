import { formatShortDate } from "@/lib/homeDisplay";
import type { EnquiryField } from "@/lib/enquiries";
import type { StoredAnswer } from "@/lib/enquiryData";

function showValue(kind: EnquiryField["kind"], value: string) {
  if (!value) return "—";
  if (kind === "date") return formatShortDate(value) ?? value;
  return value;
}

export function EnquiryResults({
  fields,
  answers,
}: {
  readonly fields: EnquiryField[]
  readonly answers: StoredAnswer[]
}) {
  const counted = fields.filter((field) => field.kind === "date" || field.kind === "choice");

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-[#14241c]">
        {`Results `}
        <span className="text-base font-medium text-[#3d5247]">{answers.length}</span>
      </h2>
      {counted.map((field) => {
        const counts = new Map<string, number>();
        for (const answer of answers) {
          const value = answer.values[field.id];
          if (!value) continue;
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        return (
          <div key={field.id} className="mt-4">
            <p className="text-sm font-semibold text-[#14241c]">{field.label}</p>
            {rows.length ? (
              <ul className="mt-2 grid gap-1">
                {rows.map(([value, count]) => (
                  <li
                    key={value}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#fffcf5] px-3 py-2 text-sm ring-1 ring-[rgba(27,58,47,0.08)]"
                  >
                    <span>{showValue(field.kind, value)}</span>
                    <span className="font-semibold tabular-nums text-[#1b3a2f]">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-[#3d5247]">No answers yet.</p>
            )}
          </div>
        );
      })}
      <ul className="mt-6 grid gap-3">
        {answers.map((answer) => (
          <li
            key={answer.responseId}
            className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.1)]"
          >
            <p className="font-semibold text-[#14241c]">
              {answer.flatNumber}
              <span className="ml-2 font-medium text-[#3d5247]">{answer.name}</span>
            </p>
            {answer.phone ? (
              <p className="text-sm tabular-nums text-[#3d5247]">{answer.phone}</p>
            ) : null}
            <dl className="mt-3 grid gap-2">
              {fields.map((field) => (
                <div key={field.id}>
                  <dt className="text-xs font-semibold tracking-wide text-[#5a6e62] uppercase">
                    {field.label}
                  </dt>
                  <dd className="text-sm text-[#14241c]">
                    {showValue(field.kind, answer.values[field.id] ?? "")}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
