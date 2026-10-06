export const FIELD_KINDS = [
  { value: "text", label: "Short answer", hint: "One line, such as a name or a number." },
  { value: "long", label: "Long answer", hint: "A paragraph they can write in their own words." },
  { value: "date", label: "Date", hint: "They pick a day on a calendar." },
  { value: "choice", label: "Pick one", hint: "They choose one option from a list you write." },
] as const;

export const RESULT_VIEWS = [
  {
    value: "community",
    label: "The community",
    hint: "Signed-in residents can read every answer.",
  },
  {
    value: "admins",
    label: "Admins only",
    hint: "Only admins can open the answers.",
  },
  {
    value: "own",
    label: "Each flat, its own",
    hint: "People see only the answer from their flat.",
  },
  {
    value: "link",
    label: "Anyone with the link",
    hint: "Answers are shown on the form page itself.",
  },
] as const;

export const VISIBILITY_OPTIONS = [
  {
    value: "public",
    label: "Anyone with the link",
    hint: "No account needed. Share the link anywhere.",
  },
  {
    value: "private",
    label: "Residents only",
    hint: "They must sign in as a community member.",
  },
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number]["value"];
export type ResultsView = (typeof RESULT_VIEWS)[number]["value"];
export type EnquiryVisibility = "public" | "private";

export type EnquiryField = {
  id: number
  sortOrder: number
  kind: FieldKind
  label: string
  required: boolean
  choices: string[]
};

export type Enquiry = {
  id: number
  slug: string
  title: string
  note: string
  visibility: EnquiryVisibility
  askSignin: boolean
  resultsView: ResultsView
  closedAt: string | null
  createdAt: string
};

export function fieldKind(value: string | null | undefined): FieldKind | null {
  return FIELD_KINDS.some((kind) => kind.value === value) ? (value as FieldKind) : null;
}

export function resultsView(value: string | null | undefined): ResultsView {
  return RESULT_VIEWS.some((item) => item.value === value)
    ? (value as ResultsView)
    : "community";
}

export function slugifyTitle(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 48);
  return base || "form";
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  if (value.includes("://")) return null;
  return value;
}
