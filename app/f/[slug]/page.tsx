import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnquiryFill } from "@/components/EnquiryFill";
import { EnquiryResults } from "@/components/EnquiryResults";
import { loadAnswers, loadEnquiryBySlug, type StoredAnswer } from "@/lib/enquiryData";
import { safeNextPath } from "@/lib/enquiries";
import { findInventoryFlat } from "@/lib/inventory";
import { normalizePhone } from "@/lib/phone";
import { isCommunityRole, canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function EnquiryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const bundle = await loadEnquiryBySlug(slug);
  if (!bundle) notFound();
  const { enquiry, fields } = bundle;
  const { user, profile, supabase } = await getAuthState();
  const next = safeNextPath(`/f/${enquiry.slug}`) ?? "/";

  if (enquiry.visibility === "private" && !user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (enquiry.visibility === "private" && !isCommunityRole(profile?.role)) {
    return (
      <div className="page-gutter mx-auto max-w-3xl py-8 md:py-14">
        <header className="form-sheet">
          <p className="eyebrow">Form</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14241c] md:text-4xl">
            {enquiry.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#3d5247]">
            This form is for residents. Sign in with a community account to open it.
          </p>
        </header>
      </div>
    );
  }

  let name = profile?.displayName?.trim() ?? "";
  let phone = "";
  let flatNumber = "";
  if (user && profile) {
    const { data: own } = await supabase
      .from("flats")
      .select("flat_number, phone, owner_name")
      .eq(profile.flatId ? "id" : "user_id", profile.flatId ?? user.id)
      .maybeSingle();
    flatNumber = String(own?.flat_number ?? "");
    phone = String(own?.phone ?? "");
    if (!name) name = String(own?.owner_name ?? "");
  }
  const knownName = name.length >= 2 ? name : "";
  const knownPhone = normalizePhone(phone) ?? "";
  const knownFlat = findInventoryFlat(flatNumber)?.flatNumber ?? "";

  const answers = await loadAnswers(enquiry.id);
  const mine = knownFlat
    ? answers.find((answer) => answer.flatNumber === knownFlat)
    : user
      ? answers.find((answer) => answer.userId === user.id)
      : undefined;
  const defaults: Record<number, string> = mine?.values ?? {};
  const admin = Boolean(user && profile && canManageAdmin(profile.role, user));
  const community = Boolean(user && profile && isCommunityRole(profile.role));
  const visible = visibleAnswers(enquiry.resultsView, admin, community, user?.id ?? null, knownFlat, answers);

  return (
    <div className="page-gutter mx-auto max-w-3xl py-8 md:py-14">
      <header className="form-sheet">
        <p className="eyebrow">Form</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14241c] md:text-4xl">
          {enquiry.title}
        </h1>
        {enquiry.note ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#3d5247]">{enquiry.note}</p>
        ) : (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#3d5247]">
            Answer each question below. Required questions are marked.
          </p>
        )}
        {enquiry.askSignin && !user ? (
          <p className="mt-4 rounded-2xl bg-[rgba(201,164,92,0.18)] px-4 py-3 text-sm leading-relaxed text-[#14241c]">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#1b3a2f]">
              Sign in
            </Link>{" "}
            so your name and flat are filled in. You can also type them below.
          </p>
        ) : null}
      </header>
      <EnquiryFill
        slug={enquiry.slug}
        fields={fields}
        defaults={defaults}
        closed={Boolean(enquiry.closedAt)}
        updating={Boolean(mine)}
        identity={{ name: knownName, phone: knownPhone, flatNumber: knownFlat }}
      />
      {visible ? <EnquiryResults fields={fields} answers={visible} /> : null}
    </div>
  );
}

function visibleAnswers(
  view: string,
  admin: boolean,
  community: boolean,
  userId: string | null,
  flatNumber: string,
  answers: StoredAnswer[],
) {
  if (admin || view === "link" || (view === "community" && community)) return answers;
  if (view === "own" && (userId || flatNumber)) {
    return answers.filter(
      (answer) =>
        (userId && answer.userId === userId) ||
        (flatNumber && answer.flatNumber === flatNumber),
    );
  }
  return null;
}
