import { redirect } from "next/navigation";
import { saveHomeDocument } from "@/app/actions/community-os";
import { DeskError, FeatureOff } from "@/components/FeatureOff";
import { ChoiceField, TextAreaField, TextField } from "@/components/form-ui";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { canEditFlat } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function DocumentsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/documents");
  if (!profile.flatId) redirect("/");
  const access = await resolveDeskAccess(profile.role, user, "documents");
  if (access === "none") return <FeatureOff label="Home records" />;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("home_documents")
    .select("id, title, kind, note, created_at")
    .eq("flat_id", profile.flatId)
    .order("created_at", { ascending: false });
  if (error) return <DeskError message={error.message} />;

  return (
    <section className="page-gutter max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Home</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#0f172a]">Home records</h1>
      <p className="mt-2 text-[#475569]">
        Record the possession letter, the verification, or another paper for this home, and where it is kept.
      </p>
      {access === "manage" && canEditFlat(profile.role) ? (
        <form action={saveHomeDocument} className="field-panel mt-6 grid gap-4">
          <ChoiceField
            legend="What paper is this?"
            name="kind"
            required
            defaultValue="possession"
            layout="stack"
            options={[
              { value: "possession", label: "Possession letter", hint: "The letter that handed this home over." },
              { value: "verification", label: "Verification", hint: "The check that the owner and this home match." },
              { value: "other", label: "Other paper", hint: "Any other paper kept for this home." },
            ]}
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
          <button type="submit" className="btn-slate w-fit">Add record</button>
        </form>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((paper) => (
          <li key={paper.id} className="slab p-4">
            <p className="text-xs font-semibold tracking-[0.08em] text-[#b45309] uppercase">
              {paper.kind === "possession" ? "Possession letter" : paper.kind === "verification" ? "Verification" : "Other paper"}
            </p>
            <h2 className="mt-1 font-semibold text-[#0f172a]">{paper.title}</h2>
            {paper.note ? <p className="mt-1 text-sm text-[#475569]">{paper.note}</p> : null}
          </li>
        ))}
        {!data?.length ? <li className="text-sm text-[#475569]">No records yet.</li> : null}
      </ul>
    </section>
  );
}
