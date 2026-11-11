import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildingGuide } from "@/components/BuildingGuide";
import JoinWizard from "@/components/JoinWizard";
import { joinKindLabel } from "@/lib/join";
import { getProjectInfo } from "@/lib/projectInfo";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>
}) {
  const { user, profile, supabase } = await getAuthState();
  const params = await searchParams;
  const forceRequest = params.request === "1";

  if (!user || !profile) redirect("/login");
  if (canManageAdmin(profile.role, user)) redirect("/account");
  if (isCommunityRole(profile.role)) redirect("/feed");

  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (flat) redirect("/feed");

  const { data: latest } = await supabase
    .from("registration_requests")
    .select("flat_number, owner_name, status, request_kind, why_note, reject_reason, intent_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.status === "pending") {
    const project = await getProjectInfo(supabase);
    const work = latest.intent_path === "work";
    return (
      <div>
        <section className="page-gutter max-w-xl py-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#b45309] uppercase">
            Pending
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
            Waiting for approval
          </h1>
          <p className="mt-3 text-[#475569]">
            Signed in as {user.email}. Your{" "}
            <strong>{joinKindLabel(latest.request_kind)}</strong> request
            {work
              ? " for work access"
              : latest.flat_number
                ? <> for flat <strong>{latest.flat_number}</strong></>
                : null}{" "}
            is with an admin. Until then you can browse the public apartment pages below.
          </p>
        </section>
        <BuildingGuide project={project} showVisit={false} signedIn />
      </div>
    );
  }

  const browsing = String(user.user_metadata?.joinIntent || "") === "browse";
  if (browsing && !forceRequest && latest?.status !== "rejected") {
    const project = await getProjectInfo(supabase);
    return (
      <div>
        <section className="page-gutter max-w-xl py-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#b45309] uppercase">
            Exploring
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
            Public apartment pages
          </h1>
          <p className="mt-3 text-[#475569]">
            You can browse the project below. When you are ready, request home or work access.
          </p>
          <Link href="/register?request=1" className="btn btn-gold mt-4 inline-flex">
            Request access
          </Link>
        </section>
        <BuildingGuide project={project} showVisit={false} signedIn />
      </div>
    );
  }

  const defaultName =
    String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();

  return (
    <JoinWizard
      defaultName={defaultName}
      email={user.email || ""}
      rejectedReason={
        latest?.status === "rejected"
          ? latest.reject_reason || "That request was not approved. You can send a new one."
          : ""
      }
    />
  );
}
