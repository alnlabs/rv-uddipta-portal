import { redirect } from "next/navigation";
import { ApprovalsList, type AdminRegistrationRequest } from "@/components/ApprovalsList";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AdminApprovalsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/admin/builder");

  const admin = createAdminClient();
  const { data: requests, error } = await admin
    .from("registration_requests")
    .select(
      "id, flat_number, floor, type, owner_name, email, phone, status, reject_reason",
    )
    .order("created_at", { ascending: false });

  const rows = (requests ?? []) as AdminRegistrationRequest[];

  return (
    <>
      {error ? <p className="mb-4 text-[#8a2f2f]">{error.message}</p> : null}
      <ApprovalsList requests={rows} />
    </>
  );
}
