import { isSuperAdmin } from "@/lib/admin";
import { greeting } from "@/lib/homeDisplay";
import { loadHeldRoles } from "@/lib/heldRoles";
import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { roleLabel } from "@/lib/roleLabels";

export const dynamic = "force-dynamic";

export function phonePlace(role: string) {
  if (role === "admin") return "office";
  if (role === "builder") return "building";
  if (role === "security") return "gate";
  if (role === "facility") return "jobs";
  if (role === "staff") return "work";
  if (role === "committee") return "committee";
  return "home";
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;

  const place = phonePlace(member.profile.role);
  const roles = await loadHeldRoles(member.user.id);
  const locked = isSuperAdmin(member.user);

  return mobileJson({
    greeting: greeting(member.name),
    name: member.name,
    role: member.profile.role,
    roleLabel: roleLabel(member.profile.role),
    place,
    roles: roles.map((item) => ({ role: item.role, label: item.label })),
    canSwitch: !locked && roles.length > 1,
    flatNumber: place === "home" ? member.flatNumber : null,
    home: place === "home" && !member.flatNumber ? "No home is linked to this account yet." : null,
  });
}
