export type RoleValue =
  | "admin"
  | "builder"
  | "owner"
  | "co_owner"
  | "visitor"
  | "tenant";

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
    label: "Co-owner",
    help: "Same access as the owner on that flat.",
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
];

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
    if (input.role === "co_owner") return `Co-owner of ${input.flatNumber}`;
    if (input.role === "tenant") return `Tenant in ${input.flatNumber}`;
    return `${name} · linked to ${input.flatNumber}`;
  }
  if (input.role === "visitor") return "Signed in. No flat yet.";
  return `${name}. No flat linked.`;
}
