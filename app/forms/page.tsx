import Link from "next/link";
import { redirect } from "next/navigation";
import { FeatureOff } from "@/components/FeatureOff";
import { resolveDeskAccess } from "@/lib/deskAccess";
import { listEnquiries } from "@/lib/enquiryData";
import { isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function OpenFormsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login?next=/forms");
  if ((await resolveDeskAccess(profile.role, user, "forms")) === "none") {
    return <FeatureOff label="Forms" />;
  }
  const community = isCommunityRole(profile.role);
  const forms = await listEnquiries();
  const visible = forms.filter((form) => form.visibility === "public" || community);
  const admin = createAdminClient();
  const { data: answers } = await admin
    .from("enquiry_responses")
    .select("enquiry_id")
    .eq("user_id", user.id);
  let mineIds = new Set((answers ?? []).map((row) => row.enquiry_id as number));
  if (profile.flatId) {
    const { data: flat } = await admin.from("flats").select("flat_number").eq("id", profile.flatId).maybeSingle();
    if (flat?.flat_number) {
      const { data: byFlat } = await admin
        .from("enquiry_responses")
        .select("enquiry_id")
        .eq("flat_number", flat.flat_number);
      mineIds = new Set([...mineIds, ...(byFlat ?? []).map((row) => row.enquiry_id as number)]);
    }
  }
  const waiting = visible.filter((form) => !form.closedAt && !mineIds.has(form.id));
  const answered = visible.filter((form) => !form.closedAt && mineIds.has(form.id));
  const closed = visible.filter((form) => form.closedAt);

  return (
    <div className="page-gutter w-full py-8 md:py-14">
      <header>
        <p className="eyebrow">Community</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0f172a] md:text-4xl">
          Forms
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#475569]">
          Forms still waiting for your home, answers you already sent, and forms that are closed.
        </p>
      </header>
      {visible.length ? (
        <>
          <FormGroup title="To answer" forms={waiting} action="Fill this form" />
          <FormGroup title="Your answers" forms={answered} action="Change your answer" />
          <FormGroup
            title="Closed"
            forms={closed}
            action="Read"
            answeredIds={mineIds}
          />
        </>
      ) : (
        <p className="form-sheet mt-6 text-base leading-relaxed text-[#475569]">
          No forms right now. When one is shared, it will show up here.
        </p>
      )}
    </div>
  );
}

function FormGroup({
  title,
  forms,
  action,
  answeredIds,
}: {
  title: string
  forms: { id: number; slug: string; title: string; note: string; visibility: string; closedAt: string | null }[]
  action: string
  answeredIds?: Set<number>
}) {
  if (!forms.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">{title}</h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => {
          const yours = answeredIds?.has(form.id);
          return (
            <li key={form.id}>
              <Link href={`/f/${form.slug}`} className="form-sheet block transition hover:-translate-y-0.5">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#b45309] uppercase">
                  {form.closedAt ? (yours ? "Closed · your answer" : "Closed") : form.visibility === "private" ? "Residents only" : "Open form"}
                </p>
                <span className="mt-2 block text-xl font-semibold text-[#0f172a]">{form.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[#475569]">
                  {form.note || "Tap to read the questions."}
                </span>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#1e293b]">
                  {yours ? "Your answer" : action}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
