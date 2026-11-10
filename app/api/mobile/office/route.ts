import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { approveRegistrationAs, rejectRegistrationAs } from "@/lib/registrationReview";
import { canManageAdmin } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

function kindLabel(value: string | null | undefined) {
  if (value === "family") return "Family";
  if (value === "tenant") return "Tenant";
  return "Owner";
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Approvals are for an admin." }, 403);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("registration_requests")
    .select("id, flat_number, owner_name, email, phone, status, request_kind, created_at, reject_reason")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return mobileJson({ message: error.message }, 500);

  return mobileJson({
    waiting: (data ?? []).map((row) => ({
      id: row.id,
      home: String(row.flat_number || ""),
      name: String(row.owner_name || ""),
      email: row.email ? String(row.email) : "",
      phone: row.phone ? String(row.phone) : "",
      kind: kindLabel(row.request_kind),
      createdAt: row.created_at ? String(row.created_at) : "",
    })),
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Approvals are for an admin." }, 403);
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const id = Number(body?.id || 0);
  if (!id) return mobileJson({ message: "Choose a request." }, 400);

  const reviewer = {
    id: member.user.id,
    email: member.user.email,
    name: member.name,
  };

  if (action === "approve") {
    const result = await approveRegistrationAs(reviewer, id);
    if (!result.ok) return mobileJson({ message: result.error }, 400);
    return mobileJson({ message: "Approved.", status: "approved" });
  }

  if (action === "reject") {
    const reason = String(body?.reason || "");
    const result = await rejectRegistrationAs(reviewer, id, reason);
    if (!result.ok) return mobileJson({ message: result.error }, 400);
    return mobileJson({ message: "Rejected.", status: "rejected" });
  }

  return mobileJson({ message: "Choose approve or reject." }, 400);
}
