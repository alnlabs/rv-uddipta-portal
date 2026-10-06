"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findInventoryFlat } from "@/lib/inventory";
import {
  fieldKind,
  resultsView,
  slugifyTitle,
  type EnquiryVisibility,
  type ResultsView,
} from "@/lib/enquiries";
import { normalizePhone } from "@/lib/phone";
import { isCommunityRole, canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export type EnquiryState = { ok: boolean; message: string };

function cleanTitle(value: FormDataEntryValue | null) {
  return String(value || "").trim().slice(0, 120);
}

function visibilityOf(value: FormDataEntryValue | null): EnquiryVisibility {
  return value === "private" ? "private" : "public";
}

function viewOf(value: FormDataEntryValue | null): ResultsView {
  return resultsView(String(value || ""));
}

async function requireAdmin() {
  const auth = await getAuthState();
  if (!auth.user || !canManageAdmin(auth.profile.role, auth.user)) {
    return null;
  }
  return auth.user;
}

async function uniqueSlug(title: string) {
  const admin = createAdminClient();
  const base = slugifyTitle(title);
  let slug = base;
  for (let n = 2; n < 50; n += 1) {
    const { data } = await admin.from("enquiries").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function parseChoices(raw: string) {
  return raw
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function readQuestion(
  labelRaw: FormDataEntryValue | null,
  kindRaw: FormDataEntryValue | null,
  choicesRaw: FormDataEntryValue | null,
  required: boolean,
) {
  const label = String(labelRaw || "").trim().slice(0, 160);
  const kind = fieldKind(String(kindRaw || ""));
  if (label.length < 2 || !kind) {
    return { ok: false as const, message: "Each question needs a label and a way to answer." };
  }
  const choices = kind === "choice" ? parseChoices(String(choicesRaw || "")) : [];
  if (kind === "choice" && choices.length < 2) {
    return { ok: false as const, message: "A choice question needs at least two options." };
  }
  return { ok: true as const, row: { kind, label, required, choices } };
}

function questionsFromCreate(formData: FormData) {
  const ids = new Set<number>();
  for (const key of formData.keys()) {
    const match = /^q-(\d+)-label$/.exec(key);
    if (match) ids.add(Number(match[1]));
  }
  const ordered = [...ids].sort((a, b) => a - b);
  if (!ordered.length) {
    return { ok: false as const, message: "Write at least one question. That is the form." };
  }
  const questions = [];
  for (const id of ordered) {
    const read = readQuestion(
      formData.get(`q-${id}-label`),
      formData.get(`q-${id}-kind`),
      formData.get(`q-${id}-choices`),
      formData.get(`q-${id}-required`) === "on",
    );
    if (!read.ok) return read;
    questions.push(read.row);
  }
  return { ok: true as const, questions };
}

export async function createEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: "Only an admin can create a form." };
  const title = cleanTitle(formData.get("title"));
  if (title.length < 2) return { ok: false, message: "Give the form a title." };
  const drafted = questionsFromCreate(formData);
  if (!drafted.ok) return { ok: false, message: drafted.message };
  const note = String(formData.get("note") || "").trim().slice(0, 500);
  const slug = await uniqueSlug(title);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enquiries")
    .insert({
      slug,
      title,
      note: note || null,
      visibility: visibilityOf(formData.get("visibility")),
      ask_signin: formData.get("askSignin") === "on",
      results_view: viewOf(formData.get("resultsView")),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Could not create that form." };
  const { error: fieldError } = await admin.from("enquiry_fields").insert(
    drafted.questions.map((question, index) => ({
      enquiry_id: data.id,
      sort_order: index + 1,
      kind: question.kind,
      label: question.label,
      required: question.required,
      choices: question.choices,
    })),
  );
  if (fieldError) {
    await admin.from("enquiries").delete().eq("id", data.id);
    return { ok: false, message: "Could not create that form." };
  }
  revalidatePath("/account/forms");
  revalidatePath("/forms");
  revalidatePath(`/f/${slug}`);
  redirect(`/account/forms/${data.id}`);
}

export async function saveEnquirySettings(formData: FormData): Promise<EnquiryState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: "Only an admin can change a form." };
  const id = Number(formData.get("id"));
  const title = cleanTitle(formData.get("title"));
  if (!id || title.length < 2) return { ok: false, message: "Give the form a title." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enquiries")
    .update({
      title,
      note: String(formData.get("note") || "").trim().slice(0, 500) || null,
      visibility: visibilityOf(formData.get("visibility")),
      ask_signin: formData.get("askSignin") === "on",
      results_view: viewOf(formData.get("resultsView")),
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, message: "Could not save the form." };
  revalidatePath("/account/forms");
  revalidatePath(`/account/forms/${id}`);
  revalidatePath(`/f/${data.slug}`);
  revalidatePath("/forms");
  return { ok: true, message: "Saved." };
}

export async function setEnquiryClosed(id: number, closed: boolean) {
  const user = await requireAdmin();
  if (!user) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("enquiries")
    .update({ closed_at: closed ? new Date().toISOString() : null })
    .eq("id", id)
    .select("slug")
    .single();
  revalidatePath(`/account/forms/${id}`);
  revalidatePath("/forms");
  if (data?.slug) revalidatePath(`/f/${data.slug}`);
}

export async function addEnquiryField(formData: FormData): Promise<EnquiryState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: "Only an admin can add a question." };
  const enquiryId = Number(formData.get("enquiryId"));
  if (!enquiryId) return { ok: false, message: "Add a label and a type." };
  const read = readQuestion(
    formData.get("label"),
    formData.get("kind"),
    formData.get("choices"),
    formData.get("required") === "on",
  );
  if (!read.ok) return { ok: false, message: read.message };
  const { label, kind, choices, required } = read.row;
  const admin = createAdminClient();
  const { data: last } = await admin
    .from("enquiry_fields")
    .select("sort_order")
    .eq("enquiry_id", enquiryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await admin.from("enquiry_fields").insert({
    enquiry_id: enquiryId,
    sort_order: (last?.sort_order ?? 0) + 1,
    kind,
    label,
    required,
    choices,
  });
  if (error) return { ok: false, message: "Could not add that question." };
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("slug")
    .eq("id", enquiryId)
    .maybeSingle();
  revalidatePath(`/account/forms/${enquiryId}`);
  if (enquiry?.slug) revalidatePath(`/f/${enquiry.slug}`);
  return { ok: true, message: "Question added." };
}

export async function updateEnquiryField(formData: FormData): Promise<EnquiryState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: "Only an admin can change a question." };
  const id = Number(formData.get("id"));
  const enquiryId = Number(formData.get("enquiryId"));
  const label = String(formData.get("label") || "").trim().slice(0, 160);
  if (!id || !enquiryId || label.length < 2) {
    return { ok: false, message: "Give the question a label." };
  }
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("enquiry_fields")
    .select("kind")
    .eq("id", id)
    .maybeSingle();
  const choices =
    current?.kind === "choice" ? parseChoices(String(formData.get("choices") || "")) : [];
  if (current?.kind === "choice" && choices.length < 2) {
    return { ok: false, message: "A choice question needs at least two options." };
  }
  const { error } = await admin
    .from("enquiry_fields")
    .update({
      label,
      required: formData.get("required") === "on",
      ...(current?.kind === "choice" ? { choices } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, message: "Could not save that question." };
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("slug")
    .eq("id", enquiryId)
    .maybeSingle();
  revalidatePath(`/account/forms/${enquiryId}`);
  if (enquiry?.slug) revalidatePath(`/f/${enquiry.slug}`);
  return { ok: true, message: "Question saved." };
}

export async function deleteEnquiryField(enquiryId: number, fieldId: number) {
  const user = await requireAdmin();
  if (!user) return;
  const admin = createAdminClient();
  const { count } = await admin
    .from("enquiry_answers")
    .select("field_id", { count: "exact", head: true })
    .eq("field_id", fieldId);
  if (count) return;
  const { count: fieldCount } = await admin
    .from("enquiry_fields")
    .select("id", { count: "exact", head: true })
    .eq("enquiry_id", enquiryId);
  if ((fieldCount ?? 0) <= 1) return;
  await admin.from("enquiry_fields").delete().eq("id", fieldId).eq("enquiry_id", enquiryId);
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("slug")
    .eq("id", enquiryId)
    .maybeSingle();
  revalidatePath(`/account/forms/${enquiryId}`);
  if (enquiry?.slug) revalidatePath(`/f/${enquiry.slug}`);
}

export async function moveEnquiryField(enquiryId: number, fieldId: number, direction: -1 | 1) {
  const user = await requireAdmin();
  if (!user) return;
  const admin = createAdminClient();
  const { data: fields } = await admin
    .from("enquiry_fields")
    .select("id, sort_order")
    .eq("enquiry_id", enquiryId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  const list = fields ?? [];
  const index = list.findIndex((field) => field.id === fieldId);
  const swap = index + direction;
  if (index < 0 || swap < 0 || swap >= list.length) return;
  const current = list[index];
  const other = list[swap];
  await admin.from("enquiry_fields").update({ sort_order: other.sort_order }).eq("id", current.id);
  await admin.from("enquiry_fields").update({ sort_order: current.sort_order }).eq("id", other.id);
  const { data: enquiry } = await admin
    .from("enquiries")
    .select("slug")
    .eq("id", enquiryId)
    .maybeSingle();
  revalidatePath(`/account/forms/${enquiryId}`);
  if (enquiry?.slug) revalidatePath(`/f/${enquiry.slug}`);
}

function personFrom(formData: FormData) {
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const flat = findInventoryFlat(String(formData.get("flatNumber") || ""));
  if (name.length < 2) return { ok: false as const, message: "Enter your name." };
  if (!phone) return { ok: false as const, message: "Enter a valid 10-digit phone number." };
  if (!flat) return { ok: false as const, message: "Enter a flat like A101." };
  return { ok: true as const, name, phone, flat };
}

function answerValue(kind: string, raw: string, choices: string[]) {
  const value = raw.trim();
  if (!value) return "";
  if (kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  if (kind === "choice") return choices.includes(value) ? value : "";
  if (kind === "long") return value.slice(0, 4000);
  return value.slice(0, 500);
}

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const slug = String(formData.get("slug") || "");
  const admin = createAdminClient();
  const { data: enquiry } = await admin.from("enquiries").select().eq("slug", slug).maybeSingle();
  if (!enquiry) return { ok: false, message: "This form is not available." };
  if (enquiry.closed_at) return { ok: false, message: "This form is closed." };

  const auth = await getAuthState();
  if (enquiry.visibility === "private") {
    if (!auth.user || !isCommunityRole(auth.profile.role)) {
      return { ok: false, message: "Sign in as a community member to send this." };
    }
  }

  const { data: fieldRows } = await admin
    .from("enquiry_fields")
    .select("id, kind, label, required, choices")
    .eq("enquiry_id", enquiry.id)
    .order("sort_order", { ascending: true });

  const person = personFrom(formData);
  if (!person.ok) return { ok: false, message: person.message };
  const { name, phone, flat } = person;

  const answers: { field_id: number; value: string }[] = [];
  for (const field of fieldRows ?? []) {
    const choices = ((field.choices as string[] | null) ?? []).filter(Boolean);
    const value = answerValue(
      String(field.kind),
      String(formData.get(`q_${field.id}`) || ""),
      choices,
    );
    if (field.required && !value) {
      return { ok: false, message: `Fill in ${field.label}.` };
    }
    if (value) answers.push({ field_id: field.id as number, value });
  }

  const { data: existing } = await admin
    .from("enquiry_responses")
    .select("id")
    .eq("enquiry_id", enquiry.id)
    .eq("flat_number", flat.flatNumber)
    .maybeSingle();

  let responseId = existing?.id as number | undefined;
  if (responseId) {
    const { error } = await admin
      .from("enquiry_responses")
      .update({
        name,
        phone,
        user_id: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", responseId);
    if (error) return { ok: false, message: "Could not update that answer." };
    await admin.from("enquiry_answers").delete().eq("response_id", responseId);
  } else {
    const { data: created, error } = await admin
      .from("enquiry_responses")
      .insert({
        enquiry_id: enquiry.id,
        flat_number: flat.flatNumber,
        user_id: auth.user?.id ?? null,
        name,
        phone,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, message: "Could not send that." };
    responseId = created.id as number;
  }

  if (answers.length) {
    const { error } = await admin.from("enquiry_answers").insert(
      answers.map((answer) => ({ ...answer, response_id: responseId })),
    );
    if (error) return { ok: false, message: "Could not save the answers." };
  }

  revalidatePath(`/f/${slug}`);
  revalidatePath(`/account/forms/${enquiry.id}`);
  return {
    ok: true,
    message: existing
      ? "Your earlier answer for this flat was updated."
      : "Sent.",
  };
}
