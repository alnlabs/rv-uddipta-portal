import { isSuperAdmin } from "@/lib/admin";
import { greeting } from "@/lib/homeDisplay";
import { loadHeldRoles } from "@/lib/heldRoles";
import { isCommunityRole } from "@/lib/roles";
import { mobileJson, readMobileAuth } from "@/lib/mobileSession";
import { roleLabel } from "@/lib/roleLabels";

export const dynamic = "force-dynamic";

export function phonePlace(role: string, superAdmin = false) {
  if (superAdmin) return "office";
  if (role === "security") return "gate";
  if (role === "staff" || role === "facility") return "work";
  // Society admin is also a resident — keep the home shell.
  return "home";
}

export async function GET(request: Request) {
  const auth = await readMobileAuth(request);
  if (auth instanceof Response) return auth;

  const superAdmin = isSuperAdmin(auth.user);
  // Super admin may have no community role; everyone else needs one.
  if (!superAdmin && !isCommunityRole(auth.profile.role)) {
    return mobileJson({ message: "You can do this after your flat is approved." }, 403);
  }

  const place = phonePlace(auth.profile.role, superAdmin);
  const roles = superAdmin ? [] : await loadHeldRoles(auth.user.id);

  const linked = Boolean(auth.profile.flatId && auth.flatNumber);

  return mobileJson({
    greeting: greeting(auth.name),
    name: auth.name,
    role: superAdmin ? "admin" : auth.profile.role,
    roleLabel: superAdmin ? "Super admin" : roleLabel(auth.profile.role),
    place,
    roles: superAdmin
      ? [{ role: "admin", label: "Super admin" }]
      : roles.map((item) => ({ role: item.role, label: item.label })),
    canSwitch: !superAdmin && roles.length > 1,
    superAdmin,
    locked: superAdmin,
    hasFlat: linked,
    flatNumber: linked ? auth.flatNumber : null,
    home: !linked && place === "home" ? "No home is linked to this account yet." : null,
  });
}
