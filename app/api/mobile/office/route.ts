import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { canManageAdmin } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canManageAdmin(member.profile.role, member.user)) return mobileJson({ message: "The office is for an admin." }, 403);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("registration_requests")
    .select("id, flat_number, owner_name, status, request_kind")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return mobileJson({ message: error.message }, 500);
  return mobileJson({
    waiting: (data ?? []).map((row) => ({
      id: row.id,
      home: row.flat_number,
      name: row.owner_name,
      kind: row.request_kind === "family" ? "Family" : "Owner",
    })),
  });
}
