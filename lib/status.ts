export const STATUS_FIELDS = [
  {
    key: "registration",
    label: "Registration",
    dateKey: "registrationDate",
    dateColumn: "registration_date",
    options: [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "interior",
    label: "Interior",
    dateKey: "interiorDate",
    dateColumn: "interior_date",
    startDateKey: "interiorStartDate",
    startDateColumn: "interior_start_date",
    options: [
      { value: "not_started", label: "Not started" },
      { value: "in_progress", label: "In progress" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "ceremony",
    label: "Home ceremony",
    dateKey: "ceremonyDate",
    dateColumn: "ceremony_date",
    options: [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "moving",
    label: "Move-in",
    dateKey: "movingDate",
    dateColumn: "moving_date",
    options: [
      { value: "pending", label: "Pending" },
      { value: "moved_in", label: "Moved in" },
    ],
  },
] as const;

export const STATUS_LABELS = {
  registration: {
    pending: "Reg pending",
    completed: "Registered",
  },
  interior: {
    not_started: "Interior soon",
    in_progress: "Interior on",
    completed: "Interior done",
  },
  ceremony: {
    pending: "Ceremony soon",
    completed: "Ceremony done",
  },
  moving: {
    pending: "Not moved",
    moved_in: "Moved in",
  },
} as const;

export const MEMBER_RELATIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
] as const;

export type StatusKey = (typeof STATUS_FIELDS)[number]["key"];
export type StatusDateKey = (typeof STATUS_FIELDS)[number]["dateKey"];
export type MemberRelation = (typeof MEMBER_RELATIONS)[number]["value"];

export function relationLabel(relation: string) {
  return MEMBER_RELATIONS.find((item) => item.value === relation)?.label ?? relation;
}
