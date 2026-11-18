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
    return <FeatureOff label="Enquiries" />;
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
          Enquiries
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#475569]">
          Open ones for your home, ones you already sent, and closed enquiries.
        </p>
      </header>
      {visible.length ? (
        <>
          <EnquiryGroup title="Open for you" forms={waiting} action="Open" />
          <ReplyList title="Your replies" forms={answered} />
          <EnquiryGroup
            title="Closed"
            forms={closed}
            action="Read"
            answeredIds={mineIds}
          />
        </>
      ) : (
        <p className="form-sheet mt-6 text-base leading-relaxed text-[#475569]">
          No enquiries right now. When one is shared, it will show up here.
        </p>
      )}
    </div>
  );
}

type EnquiryCard = {
  id: number
  slug: string
  title: string
  note: string
  visibility: string
  closedAt: string | null
};

function EnquiryGroup({
  title,
  forms,
  action,
  answeredIds,
}: {
  title: string
  forms: EnquiryCard[]
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
                <p className="text-sm text-[#64748b]">
                  {form.closedAt
                    ? yours
                      ? "Closed · you replied"
                      : "Closed"
                    : form.visibility === "private"
                      ? "Residents only"
                      : "Open"}
                </p>
                <span className="mt-2 block text-xl font-semibold text-[#0f172a]">{form.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-[#475569]">
                  {form.note || "Tap to read the questions."}
                </span>
                <span className="mt-4 inline-flex text-sm text-[#475569]">{action} →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Your replies: simple rows, not the same card grid as open enquiries. */
function ReplyList({ title, forms }: { title: string; forms: EnquiryCard[] }) {
  if (!forms.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold tracking-[0.08em] text-[#64748b] uppercase">{title}</h2>
      <ul className="mt-3 divide-y divide-[rgba(15,23,42,0.08)] border-y border-[rgba(15,23,42,0.08)]">
        {forms.map((form) => (
          <li key={form.id}>
            <Link
              href={`/f/${form.slug}`}
              className="flex flex-wrap items-baseline justify-between gap-2 py-4 transition hover:bg-[#f8fafc]"
            >
              <span>
                <span className="block font-semibold text-[#0f172a]">{form.title}</span>
                <span className="mt-0.5 block text-sm text-[#64748b]">
                  {form.note ? form.note.replace(/<[^>]+>/g, "").slice(0, 80) : "Update your reply"}
                </span>
              </span>
              <span className="text-sm text-[#475569]">View or update →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
