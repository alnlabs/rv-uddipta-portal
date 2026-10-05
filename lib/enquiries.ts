export const FIELD_KINDS = [
  { value: "text", label: "Short text" },
  { value: "long", label: "Long text" },
  { value: "date", label: "Date" },
  { value: "choice", label: "Choice" },
] as const;

export const RESULT_VIEWS = [
  { value: "community", label: "Signed-in community members see every answer" },
  { value: "admins", label: "Admins only" },
  { value: "own", label: "Each person sees only their own answers" },
  { value: "link", label: "Anyone with the link sees every answer" },
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
