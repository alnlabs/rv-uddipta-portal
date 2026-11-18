import { formatShortDate } from "@/lib/homeDisplay";
import type { EnquiryField } from "@/lib/enquiries";
import type { StoredAnswer } from "@/lib/enquiryData";

function showValue(kind: EnquiryField["kind"], value: string) {
  if (!value.trim()) return null;
  if (kind === "date") return formatShortDate(value) ?? value;
  return value;
}

function byFlat(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

/** One-line choice summary, e.g. "Yes 12 · No 3" — no charts. */
function choiceSummary(field: EnquiryField, answers: StoredAnswer[]) {
  if (field.kind !== "choice" || !field.choices.length) return null;
  const counts = new Map<string, number>();
  for (const choice of field.choices) counts.set(choice, 0);
  for (const answer of answers) {
    const raw = answer.values[field.id]?.trim() ?? "";
    if (!raw) continue;
    const match =
      field.choices.find((choice) => choice.toLowerCase() === raw.toLowerCase()) ?? raw;
    counts.set(match, (counts.get(match) ?? 0) + 1);
  }
  const parts = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} ${count}`);
  return parts.length ? parts.join(" · ") : null;
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
  const people = [...answers].sort((a, b) => {
    if (highlightFlat) {
      if (a.flatNumber === highlightFlat) return -1;
      if (b.flatNumber === highlightFlat) return 1;
    }
    return byFlat(a.flatNumber, b.flatNumber);
  });

  const summaries = fields
    .map((field) => {
      const line = choiceSummary(field, people);
      return line ? { id: field.id, label: field.label, line } : null;
    })
    .filter(Boolean) as { id: number; label: string; line: string }[];

  return (
    <section className="mt-10">
      <p className="eyebrow">Replies</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#0f172a]">
        {people.length === 0
          ? "No replies yet"
          : people.length === 1
            ? "1 home has replied"
            : `${people.length} homes have replied`}
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#475569]">
          When a home sends a reply, it will show here — one home at a time.
        </p>
      ) : null}

      {summaries.length ? (
        <ul className="mt-4 grid gap-1 text-sm text-[#475569]">
          {summaries.map((item) => (
            <li key={item.id}>
              <span className="text-[#64748b]">{item.label}: </span>
              {item.line}
            </li>
          ))}
        </ul>
      ) : null}

      {people.length ? (
        <ul className="mt-6 divide-y divide-[rgba(15,23,42,0.08)] border-t border-[rgba(15,23,42,0.08)]">
          {people.map((answer) => (
            <li key={answer.responseId} className="py-5">
              <HomeReply
                answer={answer}
                fields={fields}
                yours={Boolean(highlightFlat && answer.flatNumber === highlightFlat)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function HomeReply({
  answer,
  fields,
  yours,
}: {
  answer: StoredAnswer
  fields: EnquiryField[]
  yours: boolean
}) {
  const sent = formatShortDate(answer.updatedAt);
  const rows = fields
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: showValue(field.kind, answer.values[field.id] ?? ""),
    }))
    .filter((row) => row.value);

  return (
    <article>
      <p className="text-[#0f172a]">
        <span className="font-semibold">{answer.flatNumber || "Home"}</span>
        {yours ? <span className="text-[#64748b]"> · yours</span> : null}
        <span className="text-[#475569]">
          {" · "}
          {answer.name || "Name not given"}
          {sent ? ` · ${sent}` : ""}
        </span>
      </p>
      {rows.length ? (
        <dl className="mt-3 grid gap-2.5">
          {rows.map((row) => (
            <div key={row.id} className="grid gap-0.5 sm:grid-cols-[minmax(8rem,14rem)_1fr] sm:gap-4">
              <dt className="text-sm text-[#64748b]">{row.label}</dt>
              <dd className="whitespace-pre-wrap text-base leading-relaxed text-[#0f172a]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-[#475569]">Blank reply.</p>
      )}
    </article>
  );
}
