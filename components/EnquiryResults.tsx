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
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Answers</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
            What people sent
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#3d5247]">
          {answers.length === 1 ? "1 answer" : `${answers.length} answers`}
        </p>
      </div>

      {counted.length ? (
        <div className="mt-4 grid gap-4">
          {counted.map((field) => {
            const counts = new Map<string, number>();
            for (const answer of answers) {
              const value = answer.values[field.id];
              if (!value) continue;
              counts.set(value, (counts.get(value) ?? 0) + 1);
            }
            const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            const max = rows[0]?.[1] ?? 1;
            return (
              <div key={field.id} className="form-sheet">
                <p className="text-base font-semibold text-[#14241c]">{field.label}</p>
                {rows.length ? (
                  <ul className="mt-4 grid gap-3">
                    {rows.map(([value, count]) => (
                      <li key={value}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-[#14241c]">{showValue(field.kind, value)}</span>
                          <span className="font-semibold tabular-nums text-[#1b3a2f]">{count}</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[rgba(27,58,47,0.08)]">
                          <div
                            className="h-full rounded-full bg-[#1b3a2f]"
                            style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[#3d5247]">No answers for this question yet.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {answers.length ? (
        <ul className="mt-4 grid gap-4">
          {answers.map((answer) => (
            <li key={answer.responseId} className="form-sheet">
              <p className="text-lg font-semibold text-[#14241c]">{answer.flatNumber}</p>
              <p className="text-sm text-[#3d5247]">
                {answer.name}
                {answer.phone ? <span className="tabular-nums"> · {answer.phone}</span> : null}
              </p>
              <dl className="mt-4 grid gap-3">
                {fields.map((field) => (
                  <div key={field.id}>
                    <dt className="text-xs font-semibold tracking-wide text-[#5a6e62] uppercase">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 text-base leading-relaxed text-[#14241c]">
                      {showValue(field.kind, answer.values[field.id] ?? "")}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="form-sheet mt-4 text-sm leading-relaxed text-[#3d5247]">
          No answers yet. Share the link and they will show up here.
        </p>
      )}
    </section>
  );
}
