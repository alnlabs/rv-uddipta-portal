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
    "id, flat_number, floor, type, owner_name, email, phone, status, reject_reason";
  const requestsWithEmail = await admin
    .from("registration_requests")
    .select(requestColumns)
    .order("created_at", { ascending: false });
  const requestsResult =
    requestsWithEmail.error &&
    /column .*email.* does not exist/i.test(requestsWithEmail.error.message)
      ? await admin
          .from("registration_requests")
          .select(
            "id, flat_number, floor, type, owner_name, phone, status, reject_reason",
          )
          .order("created_at", { ascending: false })
      : requestsWithEmail;

  const [
    sold,
    unsold,
    named,
    linked,
    profiles,
  ] = await Promise.all([
    admin
      .from("flats")
      .select("*", { count: "exact", head: true })
      .eq("sale_status", "sold"),
    admin
      .from("flats")
      .select("*", { count: "exact", head: true })
      .eq("sale_status", "unsold"),
    admin
      .from("flats")
      .select("*", { count: "exact", head: true })
      .not("owner_name", "is", null),
    admin
      .from("flats")
      .select("*", { count: "exact", head: true })
      .not("user_id", "is", null),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true }),
  ]);

  const rows = (requestsResult.data ?? []) as AdminRegistrationRequest[];

  return (
    <AdminHome
      stats={{
        pending: rows.filter((row) => row.status === "pending").length,
        sold: sold.count ?? 0,
        unsold: unsold.count ?? 0,
        named: named.count ?? 0,
        linked: linked.count ?? 0,
        profiles: profiles.count ?? 0,
      }}
      requests={rows}
      loadError={requestsResult.error?.message ?? null}
    />
  );
}
