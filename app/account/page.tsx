import { redirect } from "next/navigation";
import { AdminHome } from "@/components/AdminHome";
import type { AdminRegistrationRequest } from "@/components/ApprovalsList";
import { canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export default async function AccountApprovalsPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!canManageAdmin(profile.role, user)) redirect("/account/builder");

  const admin = createAdminClient();
  const requestColumns =
    "id, flat_number, floor, type, owner_name, email, phone, status, reject_reason, request_kind";
  const requestsWithEmail = await admin
    .from("registration_requests")
    .select(requestColumns)
    .order("created_at", { ascending: false });
  const requestsResult =
    requestsWithEmail.error &&
    /column .* does not exist/i.test(requestsWithEmail.error.message)
      ? await admin
          .from("registration_requests")
          .select(
            "id, flat_number, floor, type, owner_name, email, phone, status, reject_reason",
          )
          .order("created_at", { ascending: false })
      : requestsWithEmail;

  const { data: flatRows } = await admin
    .from("flats")
    .select("owner_name, email, phone");
  const flatsWithoutOwner = (flatRows ?? []).filter(
    (flat) => !flat.owner_name || !flat.email || !flat.phone,
  ).length;

  const rows = (requestsResult.data ?? []) as AdminRegistrationRequest[];

  return (
    <AdminHome
      waiting={rows.filter((row) => row.status === "pending").length}
      flatsWithoutOwner={flatsWithoutOwner}
      requests={rows}
      loadError={requestsResult.error?.message ?? null}
    />
  );
}
