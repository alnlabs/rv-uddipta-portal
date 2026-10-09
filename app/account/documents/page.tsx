import Link from "next/link";
import { redirect } from "next/navigation";
import { saveHomeDocument } from "@/app/actions/community-os";
import { DeskError } from "@/components/FeatureOff";
import { ChoiceField, TextAreaField, TextField } from "@/components/form-ui";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

const KINDS = [
  { value: "possession", label: "Possession letter", hint: "The letter that handed this home over." },
  { value: "verification", label: "Verification", hint: "The check that the owner and this home match." },
  { value: "other", label: "Other paper", hint: "Any other paper kept for this home." },
] as const;

function paperName(kind: string) {
  return KINDS.find((item) => item.value === kind)?.label ?? "Other paper";
}

function searchTerm(raw: string) {
  return raw.replace(/["\\]/g, "").replace(/[^a-zA-Z0-9 +\-_]/g, "").trim().slice(0, 64);
}

type FlatRow = {
  id: number
  flat_number: string
  owner_name: string | null
};

type PaperRow = {
  id: number
  flat_id: number
  title: string
  kind: string
  note: string | null
};

export default async function OfficeDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ flat?: string; q?: string }>
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/");
  const params = await searchParams;
  const selected = (params.flat || "").trim().toUpperCase();
  const term = searchTerm(params.q || "").toLowerCase();
  const admin = createAdminClient();
  const [flatsResult, papersResult] = await Promise.all([
    admin.from("flats").select("id, flat_number, owner_name").order("floor").order("unit"),
    admin.from("home_documents").select("id, flat_id, title, kind, note").order("created_at", { ascending: false }),
  ]);
  if (flatsResult.error) return <DeskError message={flatsResult.error.message} />;
  if (papersResult.error) return <DeskError message={papersResult.error.message} />;

  const flats = (flatsResult.data ?? []) as FlatRow[];
  const papers = (papersResult.data ?? []) as PaperRow[];
  const byHome = new Map<number, PaperRow[]>();
  for (const paper of papers) {
    const list = byHome.get(paper.flat_id) ?? [];
    list.push(paper);
    byHome.set(paper.flat_id, list);
  }
  const shown = flats.filter((flat) => {
    if (!term) return true;
    return (
      flat.flat_number.toLowerCase().includes(term) ||
      (flat.owner_name || "").toLowerCase().includes(term)
    );
  });
  const withRecords = shown.filter((flat) => byHome.has(flat.id));
  const rows = term ? shown : [...withRecords, ...shown.filter((flat) => !byHome.has(flat.id))];
  const flat = flats.find((item) => item.flat_number.toUpperCase() === selected) ?? null;
  const records = flat ? byHome.get(flat.id) ?? [] : [];
  const qParam = term ? `&q=${encodeURIComponent(term)}` : "";

  return (
    <section>
      <h1 className="text-3xl font-semibold text-[#0f172a]">Home records</h1>
      <p className="mt-2 max-w-3xl text-[#475569]">
        Choose a home. Then record its possession letter, verification, or another paper, and where it is kept.
      </p>
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div>
          <form action="/account/documents" className="mb-3">
            {selected ? <input type="hidden" name="flat" value={selected} /> : null}
            <TextField
              label="Find a home"
              name="q"
              defaultValue={params.q || ""}
              hint="Home number or owner name."
            />
            <button type="submit" className="btn-line mt-3">Find</button>
          </form>
          <ul className="max-h-[min(36rem,70dvh)] overflow-auto rounded-2xl border border-[rgba(15,23,42,0.12)] bg-white">
            {rows.length === 0 ? (
              <li className="px-4 py-4 text-sm text-[#475569]">No home matches.</li>
            ) : null}
            {rows.map((item) => {
              const homePapers = byHome.get(item.id) ?? [];
              const active = flat?.id === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={`/account/documents?flat=${item.flat_number}${qParam}`}
                    className={`block border-b border-[rgba(15,23,42,0.06)] px-4 py-3 ${
                      active ? "bg-[#1e293b] text-[#f8fafc]" : "hover:bg-[rgba(15,23,42,0.04)]"
                    }`}
                  >
                    <strong className="text-lg">{item.flat_number}</strong>
                    <span className="mt-0.5 block truncate text-sm opacity-80">
                      {item.owner_name || "No owner name"}
                    </span>
                    {homePapers.length ? (
                      <span className="mt-1 block text-sm opacity-80">
                        {homePapers.map((paper) => paperName(paper.kind)).join(" · ")}
                      </span>
                    ) : (
                      <span className="mt-1 block text-sm opacity-60">No record yet</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        {flat ? (
          <div>
            <form action={saveHomeDocument} className="field-panel grid gap-4">
              <input type="hidden" name="flatNumber" value={flat.flat_number} />
              <ChoiceField
                legend={`What paper is this for ${flat.flat_number}?`}
                name="kind"
                required
                defaultValue="possession"
                layout="stack"
                options={KINDS}
              />
              <TextField
                label="Name"
                name="title"
                required
                hint="How this home refers to it, such as Possession letter."
              />
              <TextAreaField
                label="Where it is kept"
                name="note"
                rows={3}
                hint="A cupboard, the office file, or with the owner."
              />
              <button type="submit" className="btn-slate w-fit">Add for {flat.flat_number}</button>
            </form>
            <ul className="mt-4 grid gap-2">
              {records.map((paper) => (
                <li key={paper.id} className="slab px-4 py-3">
                  <p className="font-semibold text-[#0f172a]">{paper.title}</p>
                  <p className="text-sm text-[#475569]">
                    {paperName(paper.kind)}
                    {paper.note ? ` · ${paper.note}` : ""}
                  </p>
                </li>
              ))}
              {records.length === 0 ? (
                <li className="text-sm text-[#475569]">Nothing recorded for {flat.flat_number} yet.</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <p className="slab px-4 py-6 text-[#475569]">
            {selected
              ? "That home is not in the brochure."
              : "Choose a home from the list. Homes that already have a record are listed first."}
          </p>
        )}
      </div>
    </section>
  );
}
