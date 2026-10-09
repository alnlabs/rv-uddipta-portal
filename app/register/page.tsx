import { redirect } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { canManageAdmin, isCommunityRole } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function RegisterPage() {
  const { user, profile, supabase } = await getAuthState();

  if (!user || !profile) redirect("/login");
  if (canManageAdmin(profile.role, user)) redirect("/account");
  if (isCommunityRole(profile.role)) redirect("/feed");

  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (flat) redirect("/feed");

  const { data: pending } = await supabase
    .from("registration_requests")
    .select("flat_number, owner_name, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    return (
      <section className="page-gutter max-w-xl py-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Pending
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          Waiting for approval
        </h1>
        <p className="mt-3 text-[#475569]">
          Signed in as {user.email}. Your request for flat{" "}
          <strong>{pending.flat_number}</strong> is with an admin. When they
          approve it, you get a notice here and the portal opens your home.
        </p>
      </section>
    );
  }

  const defaultName =
    String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();

  return <RegisterForm defaultName={defaultName} email={user.email || ""} />;
}
