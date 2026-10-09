export type RoleValue =
  | "admin"
  | "builder"
  | "owner"
  | "co_owner"
  | "visitor"
  | "tenant"
  | "committee"
  | "facility"
  | "staff"
  | "security";

export const ROLE_GUIDE: {
  value: RoleValue
  label: string
  help: string
}[] = [
  {
    value: "owner",
    label: "Owner",
    help: "Sees the community and can update their flat.",
  },
  {
    value: "co_owner",
    label: "Family",
    help: "Family on that flat. Sees the same home as the owner.",
  },
  {
    value: "tenant",
    label: "Tenant",
    help: "Sees the community. Does not edit the owner’s journey.",
  },
  {
    value: "visitor",
    label: "Visitor",
    help: "Signed in only. No flat, no owner names, until you approve them.",
  },
  {
    value: "builder",
    label: "Builder",
    help: "Can edit public project facts. Cannot approve owners.",
  },
  {
    value: "admin",
    label: "Admin",
    help: "Approvals, owners, roles, and builder facts.",
  },
  {
    value: "committee",
    label: "Committee",
    help: "Decisions, policies, and votes. Not tied to a home.",
  },
  {
    value: "facility",
    label: "Facility manager",
    help: "Maintenance jobs and who is doing them.",
  },
  {
    value: "staff",
    label: "Service staff",
    help: "The jobs assigned to this person.",
  },
  {
    value: "security",
    label: "Security",
    help: "The gate. Visitors do not get an account.",
  },
];

export const ROLE_GROUPS: { title: string; roles: RoleValue[] }[] = [
  { title: "Lives in a home", roles: ["owner", "co_owner", "tenant"] },
  { title: "Works for the community", roles: ["admin", "builder", "committee", "facility", "staff", "security"] },
  { title: "Signed in only", roles: ["visitor"] },
];

export function roleNeedsHome(role: string | null | undefined) {
  return role === "owner" || role === "co_owner" || role === "tenant";
}

export function roleLabel(role: string | null | undefined) {
  return ROLE_GUIDE.find((item) => item.value === role)?.label ?? role ?? "Unknown";
}

export function accessSummary(input: {
  locked: boolean
  role: string
  flatNumber: string | null
}) {
  if (input.locked) {
    return "Full admin. Cannot be linked to a society flat.";
  }
  const name = roleLabel(input.role);
  if (input.flatNumber) {
    if (input.role === "owner") return `Owner of ${input.flatNumber}`;
    if (input.role === "co_owner") return `Family of ${input.flatNumber}`;
    if (input.role === "tenant") return `Tenant in ${input.flatNumber}`;
    return `${name} · linked to ${input.flatNumber}`;
  }
  if (input.role === "visitor") return "Signed in. No flat yet.";
  return `${name}. No flat linked.`;
}
