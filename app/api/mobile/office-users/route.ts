import { isSuperAdmin } from "@/lib/admin";
import { listOfficePeopleDesk } from "@/lib/listOfficePeople";
import { mobileJson, readMobileAuth } from "@/lib/mobileSession";
import { provisionOfficeUser } from "@/lib/provisionOfficeUser";
import { canManageAdmin } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

async function requireOfficeAdmin(request: Request) {
  const auth = await readMobileAuth(request);
  if (auth instanceof Response) return auth;
  if (isSuperAdmin(auth.user) || canManageAdmin(auth.profile.role, auth.user)) {
    return auth;
  }
  const admin = createAdminClient();
  const { data: held } = await admin
    .from("person_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (held) return auth;
  return mobileJson({ message: "Only admin can manage staff." }, 403);
}

export async function GET(request: Request) {
  const auth = await requireOfficeAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const admin = createAdminClient();
    const result = await listOfficePeopleDesk(admin, auth.user);
    return mobileJson(result);
  } catch (error) {
    return mobileJson({
      message: error instanceof Error ? error.message : "Could not load people.",
    }, 400);
  }
}

export async function POST(request: Request) {
  const auth = await requireOfficeAdmin(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null) as {
    phone?: string
    pin?: string
    email?: string
    role?: string
    displayName?: string
  } | null;

  try {
    const admin = createAdminClient();
    const result = await provisionOfficeUser(admin, {
      actor: auth.user,
      phone: String(body?.phone || ""),
      pin: String(body?.pin || ""),
      email: String(body?.email || ""),
      role: String(body?.role || ""),
      displayName: String(body?.displayName || ""),
    });
    return mobileJson(result);
  } catch (error) {
    return mobileJson({
      message: error instanceof Error ? error.message : "Could not create that account.",
    }, 400);
  }
}
