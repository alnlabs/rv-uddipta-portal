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
  /** Short line for pickers: why this role + example work. Keep one sentence. */
  help: string
}[] = [
  {
    value: "owner",
    label: "Owner",
    help: "Lives in a home — guest passes, dues notes, complaints, and parking for that home.",
  },
  {
    value: "co_owner",
    label: "Family",
    help: "Family in the same home — same day-to-day tools as the owner.",
  },
  {
    value: "tenant",
    label: "Tenant",
    help: "Rents a home — guest passes and day-to-day help; cannot change owner papers.",
  },
  {
    value: "visitor",
    label: "Visitor",
    help: "Signed in with no home yet — can ask to join; community opens after approval.",
  },
  {
    value: "builder",
    label: "Builder",
    help: "Keeps public building info up to date — not homes or who may join.",
  },
  {
    value: "admin",
    label: "Admin",
    help: "Runs the office — new members, homes, dues notes, notices, and the building team.",
  },
  {
    value: "committee",
    label: "Committee",
    help: "Makes society decisions and notices — not the gate or repair jobs.",
  },
  {
    value: "facility",
    label: "Facility manager",
    help: "Looks after repairs — opens jobs and gives them to staff; shared-space bookings.",
  },
  {
    value: "staff",
    label: "Service staff",
    help: "Does the repair jobs given to them — plumbing, cleaning, lifts.",
  },
  {
    value: "security",
    label: "Security",
    help: "Works the gate — guest codes, who comes in and out, and trouble reports.",
  },
];

export function roleHelp(role: string | null | undefined) {
  return ROLE_GUIDE.find((item) => item.value === role)?.help ?? "";
}

/** Guide for Roles “?” help — plain language. */
export const PEOPLE_ROLE_GUIDE: {
  title: string
  reportsTo: string
  tasks: string
}[] = [
  {
    title: "Main office (super)",
    reportsTo: "The people who set up the whole app",
    tasks: "Switches big tools on or off, and chooses who is society admin.",
  },
  {
    title: "Society admin",
    reportsTo: "Chosen by the main office",
    tasks: "Approves new people, looks after homes, dues notes, notices, and adds the building team.",
  },
  {
    title: "Facility manager",
    reportsTo: "Society admin",
    tasks: "Opens repair jobs, gives them to staff, and handles shared-space bookings.",
  },
  {
    title: "Service staff",
    reportsTo: "Facility manager for jobs; security marks them present",
    tasks: "Does the jobs they are given — plumbing, cleaning, lifts — on My work.",
  },
  {
    title: "Security",
    reportsTo: "Society admin",
    tasks: "At the gate: guest codes, walk-ins, who enters and leaves, helper passes, and incidents.",
  },
  {
    title: "Committee",
    reportsTo: "Society admin",
    tasks: "Society decisions, votes, and official notices — not the gate or repair jobs.",
  },
  {
    title: "Builder",
    reportsTo: "Society admin",
    tasks: "Updates public building info (plans, amenities) — not homes or join requests.",
  },
  {
    title: "Owner, family, or tenant",
    reportsTo: "Added under Homes / Flats — not with Create staff here",
    tasks: "For their home: guest passes, dues notes, complaints, parking. Add them under Flats.",
  },
];

export const ROLE_GROUPS: { title: string; roles: RoleValue[] }[] = [
  { title: "Lives in a home", roles: ["owner", "co_owner", "tenant"] },
  { title: "Society roles", roles: ["admin", "builder", "committee", "facility", "staff", "security"] },
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
