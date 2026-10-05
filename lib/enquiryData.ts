import "server-only";

import {
  fieldKind,
  resultsView,
  type Enquiry,
  type EnquiryField,
} from "@/lib/enquiries";
import { createAdminClient } from "@/utils/supabase/admin";

type EnquiryRow = {
  id: number
  slug: string
  title: string
  note: string | null
  visibility: string
  ask_signin: boolean
  results_view: string
  closed_at: string | null
  created_at: string
};

type FieldRow = {
  id: number
  sort_order: number
  kind: string
  label: string
  required: boolean
  choices: string[] | null
};

export function mapEnquiry(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    note: row.note ?? "",
    visibility: row.visibility === "private" ? "private" : "public",
    askSignin: Boolean(row.ask_signin),
    resultsView: resultsView(row.results_view),
    closedAt: row.closed_at,
    createdAt: row.created_at,
  };
}

export function mapField(row: FieldRow): EnquiryField | null {
  const kind = fieldKind(row.kind);
  if (!kind) return null;
  return {
    id: row.id,
    sortOrder: row.sort_order,
    kind,
    label: row.label,
    required: Boolean(row.required),
    choices: (row.choices ?? []).map((choice) => choice.trim()).filter(Boolean),
  };
}

export async function loadEnquiryBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("enquiries").select().eq("slug", slug).maybeSingle();
  if (!data) return null;
  return loadEnquiryBundle(data as EnquiryRow);
}

export async function loadEnquiryById(id: number) {
  const admin = createAdminClient();
  const { data } = await admin.from("enquiries").select().eq("id", id).maybeSingle();
  if (!data) return null;
  return loadEnquiryBundle(data as EnquiryRow);
}

async function loadEnquiryBundle(row: EnquiryRow) {
  const admin = createAdminClient();
  const { data: fieldRows } = await admin
    .from("enquiry_fields")
    .select("id, sort_order, kind, label, required, choices")
    .eq("enquiry_id", row.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const fields = (fieldRows ?? [])
    .map((field) => mapField(field as FieldRow))
    .filter((field): field is EnquiryField => Boolean(field));
  return { enquiry: mapEnquiry(row), fields };
}

export async function listEnquiries() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("enquiries")
    .select()
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => mapEnquiry(row as EnquiryRow));
}

export type StoredAnswer = {
  responseId: number
  flatNumber: string
  name: string
  phone: string
  userId: string | null
  updatedAt: string
  values: Record<number, string>
};

export async function loadAnswers(enquiryId: number): Promise<StoredAnswer[]> {
  const admin = createAdminClient();
  const { data: responses } = await admin
    .from("enquiry_responses")
    .select("id, flat_number, name, phone, user_id, updated_at")
    .eq("enquiry_id", enquiryId)
    .order("updated_at", { ascending: false });
  const rows = responses ?? [];
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id as number);
  const { data: answers } = await admin
    .from("enquiry_answers")
    .select("response_id, field_id, value")
    .in("response_id", ids);
  const byResponse = new Map<number, Record<number, string>>();
  for (const answer of answers ?? []) {
    const responseId = answer.response_id as number;
    const current = byResponse.get(responseId) ?? {};
    current[answer.field_id as number] = String(answer.value ?? "");
    byResponse.set(responseId, current);
  }
  return rows.map((row) => ({
    responseId: row.id as number,
    flatNumber: String(row.flat_number ?? ""),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    userId: (row.user_id as string | null) ?? null,
    updatedAt: String(row.updated_at ?? ""),
    values: byResponse.get(row.id as number) ?? {},
  }));
}
