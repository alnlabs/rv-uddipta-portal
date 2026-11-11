import { isSuperAdmin } from "@/lib/admin";
import { applyPersonAccess, assertSocietyPerson } from "@/lib/assignAccess";
import { mobileJson, readMobileAuth } from "@/lib/mobileSession";
import { roleLabel, roleNeedsHome, type RoleValue } from "@/lib/roleLabels";
import { type AppRole } from "@/lib/roles";
import { loadSignInPeople } from "@/lib/signInPeople";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

const OFFICE_ROLES: RoleValue[] = [
  "admin",
  "builder",
  "committee",
  "facility",
  "staff",
  "security",
];

async function requireSuper(request: Request) {
  const auth = await readMobileAuth(request);
  if (auth instanceof Response) return auth;
  if (!isSuperAdmin(auth.user)) {
    return mobileJson({ message: "Only a super admin can manage roles." }, 403);
  }
  return auth;
}

export async function GET(request: Request) {
  const auth = await requireSuper(request);
  if (auth instanceof Response) return auth;

  const people = await loadSignInPeople();
  return mobileJson({
    roles: OFFICE_ROLES.map((value) => ({ value, label: roleLabel(value) })),
    people: people
      .filter((person) => !person.locked)
      .map((person) => ({
        userId: person.userId,
        name: person.displayName || person.email || "Signed-in person",
        email: person.email,
        role: person.role,
        roleLabel: roleLabel(person.role),
        flatNumber: person.flatNumber,
        office: !roleNeedsHome(person.role),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuper(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null) as {
    userId?: string
    role?: string
    displayName?: string
  } | null;
  const userId = String(body?.userId || "").trim();
  const role = String(body?.role || "").trim() as AppRole;
  const displayName = String(body?.displayName || "").trim();

  if (!userId) return mobileJson({ message: "Choose a person." }, 400);
  if (!OFFICE_ROLES.includes(role as RoleValue)) {
    return mobileJson({ message: "Pick a society role (admin, facility, security, and so on)." }, 400);
  }

  const admin = createAdminClient();
  const { data: account, error } = await admin.auth.admin.getUserById(userId);
  if (error) return mobileJson({ message: error.message }, 500);
  if (!account.user) return mobileJson({ message: "That person is not in the portal yet." }, 404);
  if (isSuperAdmin(account.user)) {
    return mobileJson({ message: "A super admin account cannot be changed here." }, 400);
  }

  try {
    await assertSocietyPerson(admin, account.user);
    await applyPersonAccess(admin, {
      user: account.user,
      role,
      flatNumber: "",
      displayName,
    });
  } catch (err) {
    return mobileJson({
      message: err instanceof Error ? err.message : "Could not save that role.",
    }, 400);
  }

  return mobileJson({
    ok: true,
    message: `${roleLabel(role)} saved.`,
    role,
    roleLabel: roleLabel(role),
  });
}
