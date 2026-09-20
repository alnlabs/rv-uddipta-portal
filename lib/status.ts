export const STATUS_FIELDS = [
  {
    key: "registration",
    label: "Registration",
    options: [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "interior",
    label: "Interior",
    options: [
      { value: "not_started", label: "Not started" },
      { value: "in_progress", label: "In progress" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "ceremony",
    label: "Ceremony",
    options: [
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    key: "moving",
    label: "Moving",
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

export type StatusKey = (typeof STATUS_FIELDS)[number]["key"];
