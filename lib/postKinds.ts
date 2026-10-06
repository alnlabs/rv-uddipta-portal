export const EMERGENCY_TOPICS = [
  { value: "medical", label: "Medical" },
  { value: "fire", label: "Fire" },
  { value: "security", label: "Security" },
  { value: "lift", label: "Lift" },
  { value: "gas", label: "Gas" },
  { value: "water", label: "Water" },
  { value: "power", label: "Power" },
] as const;

export type EmergencyTopic = (typeof EMERGENCY_TOPICS)[number]["value"];

export const POST_KINDS = [
  {
    value: "update",
    label: "Update",
    group: "talk",
    audience: "community",
    prompt: "What do you want to tell the community?",
    submit: "Post update",
    done: "Posted.",
  },
  {
    value: "question",
    label: "Question",
    group: "talk",
    audience: "community",
    prompt: "What do you want to ask?",
    submit: "Ask",
    done: "Question posted.",
  },
  {
    value: "quote",
    label: "Quote",
    group: "talk",
    audience: "community",
    prompt: "Which line do you want to share?",
    submit: "Post quote",
    done: "Quote posted.",
  },
  {
    value: "celebration",
    label: "Celebration",
    group: "talk",
    audience: "community",
    prompt: "What are you celebrating?",
    submit: "Post celebration",
    done: "Celebration posted.",
  },
  {
    value: "sale",
    label: "For sale",
    group: "neighbours",
    audience: "community",
    prompt: "What are you selling, and for how much?",
    submit: "Post for sale",
    done: "Listed for the community.",
  },
  {
    value: "wanted",
    label: "Wanted",
    group: "neighbours",
    audience: "community",
    prompt: "What are you looking for?",
    submit: "Post wanted",
    done: "Posted.",
  },
  {
    value: "giveaway",
    label: "Giveaway",
    group: "neighbours",
    audience: "community",
    prompt: "What are you giving away, and how can someone collect it?",
    submit: "Post giveaway",
    done: "Giveaway posted.",
  },
  {
    value: "lost",
    label: "Lost & found",
    group: "neighbours",
    audience: "community",
    prompt: "What was lost or found, and where?",
    submit: "Post",
    done: "Posted.",
  },
  {
    value: "recommendation",
    label: "Recommendation",
    group: "neighbours",
    audience: "community",
    prompt: "Who do you recommend, and what do they help with?",
    submit: "Post recommendation",
    done: "Recommendation posted.",
  },
  {
    value: "parking",
    label: "Parking",
    group: "neighbours",
    audience: "community",
    prompt: "Which slot, and for when?",
    submit: "Post parking",
    done: "Parking note posted.",
  },
  {
    value: "event",
    label: "Event",
    group: "plans",
    audience: "community",
    prompt: "What is happening?",
    submit: "Post event",
    done: "Event posted.",
  },
  {
    value: "poll",
    label: "Poll",
    group: "plans",
    audience: "community",
    prompt: "What are you asking the community?",
    submit: "Post poll",
    done: "Poll posted.",
  },
  {
    value: "alert",
    label: "Alert",
    group: "plans",
    audience: "community",
    prompt: "What should neighbours know right now?",
    submit: "Post alert",
    done: "Alert posted.",
  },
  {
    value: "emergency",
    label: "Emergency",
    group: "emergency",
    audience: "community",
    prompt: "What is happening, and where?",
    submit: "Send emergency",
    done: "Emergency sent to the community.",
  },
  {
    value: "request",
    label: "Request",
    group: "admin",
    audience: "admin",
    prompt: "What do you need from the admin?",
    submit: "Send request",
    done: "Request sent to the admin.",
  },
  {
    value: "feedback",
    label: "Feedback",
    group: "admin",
    audience: "admin",
    prompt: "What do you want the admin to know?",
    submit: "Send feedback",
    done: "Feedback sent to the admin.",
  },
] as const;

export type PostKind = (typeof POST_KINDS)[number]["value"];
export type PostGroup = (typeof POST_KINDS)[number]["group"];

export const POST_GROUPS = [
  { value: "talk", label: "Talk" },
  { value: "neighbours", label: "Neighbours" },
  { value: "plans", label: "Plans" },
  { value: "emergency", label: "Emergency" },
  { value: "admin", label: "To the admin" },
] as const;

export const FEED_FILTERS = [
  { value: "all", label: "All" },
  { value: "talk", label: "Talk" },
  { value: "neighbours", label: "Neighbours" },
  { value: "plans", label: "Plans" },
  { value: "emergency", label: "Emergency" },
] as const;

export type FeedFilter = (typeof FEED_FILTERS)[number]["value"];

const PHOTO_KINDS = new Set([
  "sale",
  "lost",
  "event",
  "recommendation",
  "wanted",
  "giveaway",
  "parking",
  "celebration",
  "emergency",
]);

export const QUOTE_MAX = 240;

export function postKind(value: string | null | undefined) {
  return POST_KINDS.find((kind) => kind.value === value) ?? null;
}

export function kindsInGroup(group: PostGroup) {
  return POST_KINDS.filter((kind) => kind.group === group);
}

export function allowsPhoto(kind: string) {
  return PHOTO_KINDS.has(kind);
}

export function emergencyTopic(value: string | null | undefined) {
  return EMERGENCY_TOPICS.find((topic) => topic.value === value) ?? null;
}

export function postTypeLabel(kind: string | null | undefined, topic?: string | null) {
  if (kind === "emergency") return emergencyTopic(topic)?.label ?? "Emergency";
  return postKind(kind)?.label ?? "Update";
}

export function matchesFeedFilter(kind: string | null | undefined, filter: FeedFilter) {
  if (filter === "all") return true;
  return postKind(kind || "update")?.group === filter;
}

export const NOTICE_KINDS = [
  { value: "announcement", label: "Announcement" },
  { value: "maintenance", label: "Maintenance" },
  { value: "meeting", label: "Meeting" },
] as const;

export type NoticeKind = (typeof NOTICE_KINDS)[number]["value"];

const MANAGED_NOTICES = new Set(["announcement", "builder_update", "maintenance", "meeting"]);

export function isManagedNotice(kind: string | null | undefined) {
  return MANAGED_NOTICES.has(kind || "");
}

export function noticeLabel(kind: string | null | undefined) {
  if (kind === "builder_update") return "Notice";
  return NOTICE_KINDS.find((item) => item.value === kind)?.label ?? "Announcement";
}
