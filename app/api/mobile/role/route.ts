import { revalidatePath } from "next/cache";
import { isSuperAdmin } from "@/lib/admin";
import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { roleLabel } from "@/lib/roleLabels";
import { createAdminClient } from "@/utils/supabase/admin";
import { phonePlace } from "@/app/api/mobile/me/route";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (isSuperAdmin(member.user)) return mobileJson({ message: "This account keeps the admin role." }, 403);

  const body = await request.json().catch(() => null);
  const role = String(body?.role || "");
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("person_roles")
    .select("role, flat_id")
    .eq("user_id", member.user.id)
    .eq("role", role)
    .maybeSingle();
  if (!row) return mobileJson({ message: "That role is not on this account." }, 403);

  const { error } = await admin
    .from("profiles")
    .update({ role: row.role, flat_id: row.flat_id })
    .eq("user_id", member.user.id);
  if (error) return mobileJson({ message: error.message }, 500);

  await admin.from("flats").update({ user_id: null }).eq("user_id", member.user.id);
  if (row.role === "owner" && row.flat_id) {
    await admin.from("flats").update({ user_id: member.user.id }).eq("id", row.flat_id);
  }
  revalidatePath("/", "layout");
  return mobileJson({
    role: row.role,
    roleLabel: roleLabel(String(row.role)),
    place: phonePlace(String(row.role)),
  });
}
