import { revalidatePath } from "next/cache";
import { desk, isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { loadAnswers, type StoredAnswer } from "@/lib/enquiryData";
import { fieldKind, resultsView, slugifyTitle, type FieldKind } from "@/lib/enquiries";
import { canManageAdmin } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

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

function visibleCommunity(
  view: string,
  isAdmin: boolean,
  flatNumber: string | null,
  answers: StoredAnswer[],
) {
  if (view === "community" || view === "link" || (view === "admins" && isAdmin)) {
    return answers;
  }
  if (view === "own" && flatNumber) {
    return answers.filter((answer) => answer.flatNumber === flatNumber);
  }
  return [];
}

export async function GET(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const access = await desk(member, "forms");
  if (access === "none") return mobileJson({ message: "Queries are turned off." }, 403);

  const admin = createAdminClient();
  const isAdmin = canManageAdmin(member.profile.role, member.user);
  const home = member.flatNumber;

  const { data: enquiries, error } = await admin
    .from("enquiries")
    .select("id, title, note, visibility, results_view, closed_at")
    .order("created_at", { ascending: false });
  if (error) return mobileJson({ message: error.message }, 500);

  const forms = [];
  for (const enquiry of enquiries ?? []) {
    const view = resultsView(enquiry.results_view);
    const [{ data: fields }, allAnswers, own] = await Promise.all([
      admin
        .from("enquiry_fields")
        .select("id, kind, label, required, choices, sort_order")
        .eq("enquiry_id", enquiry.id)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      loadAnswers(enquiry.id as number),
      home
        ? admin
            .from("enquiry_responses")
            .select("id, phone")
            .eq("enquiry_id", enquiry.id)
            .eq("flat_number", home)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let ownAnswers: { fieldId: number; value: string }[] = [];
    if (own.data?.id) {
      const { data: rows } = await admin
        .from("enquiry_answers")
        .select("field_id, value")
        .eq("response_id", own.data.id);
      ownAnswers = (rows ?? []).map((row) => ({
        fieldId: Number(row.field_id),
        value: String(row.value ?? ""),
      }));
    }

    const community = visibleCommunity(view, isAdmin, home, allAnswers);
    const canSeeCount = view === "community" || view === "link" || (view === "admins" && isAdmin) || (view === "own" && Boolean(own.data));
    forms.push({
      id: enquiry.id,
      title: enquiry.title,
      note: enquiry.note || "",
      closed: Boolean(enquiry.closed_at),
      results: view,
      homes: canSeeCount ? community.length : null,
      submitted: Boolean(own.data?.id),
      phone: own.data?.phone || "",
      fields: (fields ?? []).map((field) => ({
        id: field.id,
        kind: field.kind,
        label: field.label,
        required: Boolean(field.required),
        choices: Array.isArray(field.choices) ? field.choices.map(String) : [],
      })),
      answers: ownAnswers,
      community: community.map((answer) => ({
        responseId: answer.responseId,
        flatNumber: answer.flatNumber,
        name: answer.name,
        phone: answer.phone,
        updatedAt: answer.updatedAt,
        values: Object.fromEntries(
          Object.entries(answer.values).map(([key, value]) => [String(key), value]),
        ),
      })),
    });
  }

  return mobileJson({
    access,
    canCreate: isAdmin && access === "manage",
    flat: home,
    forms,
  });
}

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  if (!canManageAdmin(member.profile.role, member.user)) {
    return mobileJson({ message: "Only an admin can create a query." }, 403);
  }
  const access = await desk(member, "forms");
  if (access !== "manage") return mobileJson({ message: "Queries are turned off." }, 403);

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim().slice(0, 120);
  if (title.length < 2) return mobileJson({ message: "Give the query a title." }, 400);
  const note = String(body?.note || "").trim().slice(0, 500);
  const visibility = body?.visibility === "private" ? "private" : "public";
  const results = resultsView(String(body?.resultsView || "community"));
  const askSignin = Boolean(body?.askSignin);
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
  if (!rawQuestions.length) {
    return mobileJson({ message: "Write at least one question." }, 400);
  }

  const questions: { kind: FieldKind; label: string; required: boolean; choices: string[] }[] = [];
  for (const item of rawQuestions) {
    const label = String(item?.label || "").trim().slice(0, 160);
    const kind = fieldKind(String(item?.kind || "text"));
    if (label.length < 2 || !kind) {
      return mobileJson({ message: "Each question needs a label and a way to answer." }, 400);
    }
    const choices = kind === "choice"
      ? String(item?.choices || "")
          .split(/\n|,/)
          .map((value: string) => value.trim())
          .filter(Boolean)
          .slice(0, 12)
      : Array.isArray(item?.choiceList)
        ? (item.choiceList as unknown[]).map(String).map((value) => value.trim()).filter(Boolean).slice(0, 12)
        : [];
    if (kind === "choice" && choices.length < 2) {
      return mobileJson({ message: "A choice question needs at least two options." }, 400);
    }
    questions.push({
      kind,
      label,
      required: Boolean(item?.required),
      choices,
    });
  }

  const admin = createAdminClient();
  const slug = await uniqueSlug(title);
  const { data, error } = await admin
    .from("enquiries")
    .insert({
      slug,
      title,
      note: note || null,
      visibility,
      ask_signin: askSignin,
      results_view: results,
      created_by: member.user.id,
    })
    .select("id")
    .single();
  if (error || !data) return mobileJson({ message: "Could not create that query." }, 500);

  const { error: fieldError } = await admin.from("enquiry_fields").insert(
    questions.map((question, index) => ({
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
    return mobileJson({ message: "Could not create that query." }, 500);
  }

  revalidatePath("/account/forms");
  revalidatePath("/forms");
  revalidatePath(`/f/${slug}`);
  return mobileJson({ ok: true, id: data.id as number, message: "Query created." });
}
