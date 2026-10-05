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
      <div className="page-gutter max-w-xl py-6 md:py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[#14241c]">{enquiry.title}</h1>
        <p className="mt-3 text-lg text-[#3d5247]">This form is for community members.</p>
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
    <div className="page-gutter max-w-xl py-6 md:py-10">
      <p className="text-sm font-semibold text-[#7a5c22]">Form</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14241c]">{enquiry.title}</h1>
      {enquiry.note ? <p className="mt-2 text-lg text-[#3d5247]">{enquiry.note}</p> : null}
      {enquiry.askSignin && !user ? (
        <p className="mt-4 text-sm text-[#3d5247]">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[#1b3a2f]">
            Sign in
          </Link>{" "}
          to confirm it is you. You can also fill in your name, phone, and flat below.
        </p>
      ) : null}
      {mine && !enquiry.closedAt ? (
        <p className="mt-4 text-sm text-[#3d5247]">
          This flat already has an answer. Sending again updates it.
        </p>
      ) : null}
      <EnquiryFill
        slug={enquiry.slug}
        fields={fields}
        defaults={defaults}
        closed={Boolean(enquiry.closedAt)}
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
