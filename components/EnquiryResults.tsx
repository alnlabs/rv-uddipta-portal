import { formatShortDate } from "@/lib/homeDisplay";
import type { EnquiryField } from "@/lib/enquiries";
import type { StoredAnswer } from "@/lib/enquiryData";

function showValue(kind: EnquiryField["kind"], value: string) {
  if (!value.trim()) return null;
  if (kind === "date") return formatShortDate(value) ?? value;
  return value;
}

function flatCount(count: number) {
  return count === 1 ? "1 flat" : `${count} flats`;
}

export function EnquiryResults({
  fields,
  answers,
}: {
  readonly fields: EnquiryField[]
  readonly answers: StoredAnswer[]
}) {
  const counted = fields.filter((field) => field.kind === "date" || field.kind === "choice");
  const people = [...answers].sort((a, b) =>
    a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }),
  );

  return (
    <section className="mt-10">
      <div>
        <p className="eyebrow">Answers</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
          {answers.length === 0
            ? "No answers yet"
            : answers.length === 1
              ? "1 flat has answered"
              : `${answers.length} flats have answered`}
        </h2>
        {answers.length === 0 ? (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#3d5247]">
            Share the link. Each flat’s answers will show up here.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#3d5247]">
            The totals show how many flats chose each option. Below that, every flat is listed with its own answers.
          </p>
        )}
      </div>

      {answers.length && counted.length ? (
        <div className="mt-5 grid gap-4">
          {counted.map((field) => {
            const groups = new Map<string, string[]>();
            let skipped = 0;
            for (const answer of people) {
              const value = answer.values[field.id]?.trim() ?? "";
              if (!value) {
                skipped += 1;
                continue;
              }
              const flats = groups.get(value) ?? [];
              flats.push(answer.flatNumber);
              groups.set(value, flats);
            }
            const rows = [...groups.entries()].sort(
              (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
            );
            const answered = answers.length - skipped;
            return (
              <div key={field.id} className="form-sheet">
                <p className="text-lg font-semibold leading-snug text-[#14241c]">{field.label}</p>
                <p className="mt-1 text-sm text-[#3d5247]">
                  {answered === 0
                    ? "Nobody has answered this yet."
                    : `${flatCount(answered)} answered this.`}
                </p>
                {rows.length ? (
                  <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                    {rows.map(([value, flats]) => (
                      <li key={value} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[rgba(27,58,47,0.08)]">
                        <p className="text-base font-semibold text-[#14241c]">
                          {showValue(field.kind, value)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#1b3a2f]">
                          {flats.length} of {answered} {answered === 1 ? "flat" : "flats"}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">{flats.join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {skipped > 0 ? (
                  <p className="mt-3 text-sm text-[#3d5247]">
                    {flatCount(skipped)} left this blank.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {people.length ? (
        <div className="mt-8">
          <h3 className="text-xl font-semibold tracking-tight text-[#14241c]">Each flat</h3>
          <ul className="mt-4 grid gap-4 xl:grid-cols-2">
            {people.map((answer) => {
              const sent = formatShortDate(answer.updatedAt);
              return (
                <li key={answer.responseId} className="form-sheet">
                  <p className="text-xl font-semibold text-[#14241c]">{answer.flatNumber}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#3d5247]">
                    {answer.name || "Name not given"}
                    {answer.phone ? <span className="tabular-nums"> · {answer.phone}</span> : null}
                    {sent ? <span> · sent {sent}</span> : null}
                  </p>
                  <dl className="mt-4 grid gap-4">
                    {fields.map((field) => {
                      const value = showValue(field.kind, answer.values[field.id] ?? "");
                      return (
                        <div key={field.id} className="border-t border-[rgba(27,58,47,0.08)] pt-3">
                          <dt className="text-sm leading-snug text-[#3d5247]">{field.label}</dt>
                          <dd
                            className={
                              value
                                ? "mt-1 text-base font-semibold leading-relaxed text-[#14241c]"
                                : "mt-1 text-base text-[#8a9a90]"
                            }
                          >
                            {value ?? "Not answered"}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
