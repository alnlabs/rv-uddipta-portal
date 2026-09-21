import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { isSuperAdmin } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/account");

  const { data: flat } = await supabase
    .from("flats")
    .select("flat_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (flat) redirect("/");

  const { data: pending } = await supabase
    .from("registration_requests")
    .select("flat_number, owner_name, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    return (
      <section className="page-gutter max-w-xl py-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Pending
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Waiting for approval
        </h1>
        <p className="mt-3 text-[#3d5247]">
          Signed in as {user.email}. Your request for flat{" "}
          <strong>{pending.flat_number}</strong> is with an admin. You can use
          the portal after they approve it.
        </p>
      </section>
    );
  }

  const defaultName =
    String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();

  return <RegisterForm defaultName={defaultName} email={user.email || ""} />;
}
