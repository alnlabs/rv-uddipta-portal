export const HOME_JOIN_KINDS = ["owner", "family", "tenant"] as const;
export const WORK_JOIN_KINDS = [
  "builder",
  "security",
  "staff",
  "facility",
  "committee",
] as const;

export type HomeJoinKind = (typeof HOME_JOIN_KINDS)[number];
export type WorkJoinKind = (typeof WORK_JOIN_KINDS)[number];
export type JoinKind = HomeJoinKind | WorkJoinKind;
export type JoinPath = "home" | "work" | "browse";

export function isHomeJoinKind(value: string): value is HomeJoinKind {
  return (HOME_JOIN_KINDS as readonly string[]).includes(value);
}

export function isWorkJoinKind(value: string): value is WorkJoinKind {
  return (WORK_JOIN_KINDS as readonly string[]).includes(value);
}

export function isJoinKind(value: string): value is JoinKind {
  return isHomeJoinKind(value) || isWorkJoinKind(value);
}

export function pathForJoinKind(kind: JoinKind): "home" | "work" {
  return isWorkJoinKind(kind) ? "work" : "home";
}

export function roleForJoinKind(kind: JoinKind): string {
  if (kind === "family") return "co_owner";
  return kind;
}

export function joinKindLabel(kind: string | null | undefined): string {
  switch (kind) {
    case "owner":
      return "Owner";
    case "family":
      return "Family";
    case "tenant":
      return "Tenant";
    case "builder":
      return "Builder";
    case "security":
      return "Security";
    case "staff":
      return "Staff";
    case "facility":
      return "Facility";
    case "committee":
      return "Committee";
    default:
      return "Request";
  }
}

export const JOIN_PATH_OPTIONS = [
  {
    value: "home" as const,
    label: "I live here / bought a flat",
    help: "Claim ownership, join as family, or register as a tenant.",
  },
  {
    value: "work" as const,
    label: "I work for this community",
    help: "Builder, security, staff, facility, or committee access.",
  },
  {
    value: "browse" as const,
    label: "Just exploring the apartment",
    help: "See public project info. You can request access later.",
  },
];

export const HOME_KIND_OPTIONS = [
  { value: "owner" as const, label: "Owner claiming a purchased flat" },
  { value: "family" as const, label: "Family / co-owner" },
  { value: "tenant" as const, label: "Tenant" },
];

export const WORK_KIND_OPTIONS = [
  { value: "builder" as const, label: "Builder" },
  { value: "security" as const, label: "Security" },
  { value: "staff" as const, label: "Service staff" },
  { value: "facility" as const, label: "Facility manager" },
  { value: "committee" as const, label: "Committee" },
];
