import { formatShortDate } from "@/lib/homeDisplay";
import type { EnquiryField } from "@/lib/enquiries";
import type { StoredAnswer } from "@/lib/enquiryData";

function showValue(kind: EnquiryField["kind"], value: string) {
  if (!value.trim()) return null;
  if (kind === "date") return formatShortDate(value) ?? value;
  return value;
}

function homes(count: number) {
  return count === 1 ? "1 home" : `${count} homes`;
}

function byFlat(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

function filled(field: EnquiryField, answers: StoredAnswer[]) {
  return answers
    .map((answer) => ({
      flat: answer.flatNumber,
      value: answer.values[field.id]?.trim() ?? "",
    }))
    .filter((row) => row.value);
}

function groupShortText(rows: { flat: string; value: string }[]) {
  if (rows.length < 2) return false;
  if (rows.some((row) => row.value.length > 48)) return false;
  const unique = new Set(rows.map((row) => row.value.toLowerCase()));
  return unique.size < rows.length && unique.size <= Math.max(2, Math.ceil(rows.length * 0.45));
}

export function EnquiryResults({
  fields,
  answers,
  highlightFlat,
}: {
  readonly fields: EnquiryField[]
  readonly answers: StoredAnswer[]
  readonly highlightFlat?: string
}) {
  const people = [...answers].sort((a, b) => byFlat(a.flatNumber, b.flatNumber));
  const yours = highlightFlat
    ? people.find((answer) => answer.flatNumber === highlightFlat)
    : undefined;

  return (
    <section className="mt-10">
      <p className="eyebrow">Answers</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0f172a]">
        {people.length === 0
          ? "No answers yet"
          : people.length === 1
            ? "1 home has answered"
            : `${people.length} homes have answered`}
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#475569]">
          When a home sends answers, they will show up here, question by question.
        </p>
      ) : null}

      {yours && people.length > 1 ? (
        <div className="mt-5">
          <AnswerSheet answer={yours} fields={fields} title="Your home" />
        </div>
      ) : null}

      {people.length === 1 ? (
        <div className="mt-5">
          <AnswerSheet answer={people[0]} fields={fields} title={yours ? "Your home" : undefined} />
        </div>
      ) : null}

      {people.length > 1
        ? fields.map((field) => (
            <QuestionPicture key={field.id} field={field} answers={people} />
          ))
        : null}

      {people.length > 1 ? (
        <details className="form-sheet mt-8">
          <summary className="cursor-pointer text-base font-semibold text-[#0f172a]">
            Read home by home
          </summary>
          <ul className="mt-4 divide-y divide-[rgba(15,23,42,0.08)]">
            {people.map((answer) => (
              <li key={answer.responseId} className="py-4 first:pt-0 last:pb-0">
                <HomeLine answer={answer} fields={fields} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function AnswerSheet({
  answer,
  fields,
  title,
}: {
  answer: StoredAnswer
  fields: EnquiryField[]
  title?: string
}) {
  const sent = formatShortDate(answer.updatedAt);
  const rows = fields
    .map((field) => ({ field, value: showValue(field.kind, answer.values[field.id] ?? "") }))
    .filter((row) => row.value);

  return (
    <article className="form-sheet">
      <p className="text-xs font-semibold tracking-[0.14em] text-[#b45309] uppercase">
        {title || answer.flatNumber || "Answer"}
      </p>
      <h3 className="mt-1 text-xl font-semibold text-[#0f172a]">
        {title ? answer.flatNumber : answer.name || "Name not given"}
      </h3>
      <p className="mt-1 text-sm text-[#475569]">
        {title ? answer.name || "Name not given" : null}
        {answer.phone ? <span className="tabular-nums">{title ? ` · ${answer.phone}` : answer.phone}</span> : null}
        {sent ? <span> · sent {sent}</span> : null}
      </p>
      {rows.length ? (
        <dl className="mt-4 grid gap-3">
          {rows.map((row) => (
            <div key={row.field.id}>
              <dt className="text-sm text-[#475569]">{row.field.label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-base font-semibold leading-relaxed text-[#0f172a]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-[#475569]">This answer is blank.</p>
      )}
    </article>
  );
}

function QuestionPicture({
  field,
  answers,
}: {
  field: EnquiryField
  answers: StoredAnswer[]
}) {
  const rows = filled(field, answers);
  if (field.kind === "choice" || field.kind === "date") {
    return <CountedQuestion field={field} rows={rows} total={answers.length} />;
  }
  if (!rows.length) return null;
  if (field.kind === "text" && groupShortText(rows)) {
    return <CountedQuestion field={field} rows={rows} total={answers.length} />;
  }
  return (
    <section className="form-sheet mt-4">
      <h3 className="text-lg font-semibold text-[#0f172a]">{field.label}</h3>
      <p className="mt-1 text-sm text-[#475569]">{homes(rows.length)} wrote an answer.</p>
      <ul className="mt-4 grid gap-4">
        {rows
          .slice()
          .sort((a, b) => byFlat(a.flat, b.flat))
          .map((row) => (
            <li key={row.flat}>
              <p className="text-xs font-semibold tracking-[0.08em] text-[#64748b] uppercase">{row.flat}</p>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-[#0f172a]">{row.value}</p>
            </li>
          ))}
      </ul>
    </section>
  );
}

function CountedQuestion({
  field,
  rows,
  total,
}: {
  field: EnquiryField
  rows: { flat: string; value: string }[]
  total: number
}) {
  const choiceOf = (value: string) =>
    field.choices.find((choice) => choice.toLowerCase() === value.toLowerCase()) ?? value;

  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const key = field.kind === "choice" ? choiceOf(row.value) : row.value;
    const flats = groups.get(key) ?? [];
    flats.push(row.flat);
    groups.set(key, flats);
  }

  const defined = field.choices.map((choice) => choice.trim()).filter(Boolean);
  const extras = [...groups.keys()]
    .filter((value) => !defined.some((choice) => choice.toLowerCase() === value.toLowerCase()))
    .sort((a, b) => (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0) || a.localeCompare(b));
  const ordered =
    field.kind === "choice" && defined.length > 0 && defined.length <= 6
      ? [...defined.map((choice) => choiceOf(choice)), ...extras]
      : [...groups.keys()].sort((a, b) =>
          field.kind === "date"
            ? a.localeCompare(b)
            : (groups.get(b)?.length ?? 0) - (groups.get(a)?.length ?? 0) || a.localeCompare(b),
        );

  const answered = rows.length;

  return (
    <section className="form-sheet mt-4">
      <h3 className="text-lg font-semibold text-[#0f172a]">{field.label}</h3>
      <p className="mt-1 text-sm text-[#475569]">
        {answered === 0 ? "Nobody has answered this yet." : `${homes(answered)} answered.`}
      </p>
      <ul className="mt-4 grid gap-3">
        {ordered.map((value) => {
          const flats = (groups.get(value) ?? []).slice().sort(byFlat);
          const count = flats.length;
          const share = answered ? Math.round((count / answered) * 100) : 0;
          return (
            <li key={value}>
              <div className="flex items-baseline justify-between gap-3">
                <p className={count ? "font-semibold text-[#0f172a]" : "text-[#64748b]"}>
                  {showValue(field.kind, value)}
                </p>
                <p className="shrink-0 text-sm tabular-nums text-[#475569]">
                  {count === 0 ? "0" : `${count} · ${share}%`}
                </p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
                <div className="h-full rounded-full bg-[#059669]" style={{ width: `${share}%` }} />
              </div>
              {count > 0 && count <= 8 ? (
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {flats.map((flat) => (
                    <span key={flat} className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                      {flat}
                    </span>
                  ))}
                </p>
              ) : null}
              {count > 8 ? (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1e293b]">
                    {homes(count)}
                  </summary>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {flats.map((flat) => (
                      <span key={flat} className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                        {flat}
                      </span>
                    ))}
                  </p>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
      {total > answered ? (
        <p className="mt-3 text-sm text-[#475569]">{homes(total - answered)} left this blank.</p>
      ) : null}
    </section>
  );
}

function HomeLine({ answer, fields }: { answer: StoredAnswer; fields: EnquiryField[] }) {
  const sent = formatShortDate(answer.updatedAt);
  const bits = fields.flatMap((field) => {
    const value = showValue(field.kind, answer.values[field.id] ?? "");
    return value ? [{ id: field.id, text: `${field.label}: ${value}` }] : [];
  });

  return (
    <div>
      <p className="font-semibold text-[#0f172a]">
        {answer.flatNumber || "Home"}
        <span className="font-normal text-[#475569]">
          {" · "}
          {answer.name || "Name not given"}
          {sent ? ` · ${sent}` : ""}
        </span>
      </p>
      {bits.length ? (
        <ul className="mt-2 grid gap-1">
          {bits.map((bit) => (
            <li key={bit.id} className="text-sm leading-relaxed text-[#334155]">
              {bit.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-[#475569]">Blank</p>
      )}
    </div>
  );
}
