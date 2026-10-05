export const POST_KINDS = [
  {
    value: "update",
    label: "Update",
    audience: "community",
    prompt: "What do you want to tell the community?",
    submit: "Post update",
    done: "Posted.",
  },
  {
    value: "question",
    label: "Question",
    audience: "community",
    prompt: "What do you want to ask?",
    submit: "Ask",
    done: "Question posted.",
  },
  {
    value: "sale",
    label: "For sale",
    audience: "community",
    prompt: "What are you selling, and for how much?",
    submit: "Post for sale",
    done: "Listed for the community.",
  },
  {
    value: "lost",
    label: "Lost & found",
    audience: "community",
    prompt: "What was lost or found, and where?",
    submit: "Post",
    done: "Posted.",
  },
  {
    value: "event",
    label: "Event",
    audience: "community",
    prompt: "What is happening?",
    submit: "Post event",
    done: "Event posted.",
  },
  {
    value: "poll",
    label: "Poll",
    audience: "community",
    prompt: "What are you asking the community?",
    submit: "Post poll",
    done: "Poll posted.",
  },
  {
    value: "request",
    label: "Request",
    audience: "admin",
    prompt: "What do you need from the admin?",
    submit: "Send request",
    done: "Request sent to the admin.",
  },
  {
    value: "feedback",
    label: "Feedback",
    audience: "admin",
    prompt: "What do you want the admin to know?",
    submit: "Send feedback",
    done: "Feedback sent to the admin.",
  },
] as const;

export type PostKind = (typeof POST_KINDS)[number]["value"];

export function postKind(value: string | null | undefined) {
  return POST_KINDS.find((kind) => kind.value === value) ?? null;
}

export const COMMUNITY_POST_KINDS = POST_KINDS.filter((kind) => kind.audience === "community");
