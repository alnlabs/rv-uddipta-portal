"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

async function db() {
  return createClient(await cookies());
}

export type CatalogActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): CatalogActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

/** datetime-local → ISO timestamptz, or null */
function atOrNull(raw: FormDataEntryValue | null) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function revalidateCatalog() {
  revalidatePath("/account/roles");
  revalidatePath("/account/labels");
  revalidatePath("/account/jobs");
  revalidatePath("/", "layout");
}

export async function saveSocietyArea(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const { error } = await supabase.rpc("save_society_area", {
      p_area_key: String(formData.get("area_key") || "").trim(),
      p_owner_role: String(formData.get("owner_role") || "").trim(),
      p_starts_at: atOrNull(formData.get("starts_at")),
      p_ends_at: atOrNull(formData.get("ends_at")),
      p_summary: String(formData.get("summary") || "").trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveSocietyTask(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const idRaw = String(formData.get("id") || "").trim();
    const { error } = await supabase.rpc("save_society_task", {
      p_id: idRaw ? Number(idRaw) : null,
      p_label: String(formData.get("label") || "").trim() || null,
      p_summary: String(formData.get("summary") || ""),
      p_enabled: idRaw ? formData.get("enabled") === "on" || formData.get("enabled") === "true" : true,
      p_duration: String(formData.get("duration") || "regular"),
      p_starts_at: atOrNull(formData.get("starts_at")),
      p_ends_at: atOrNull(formData.get("ends_at")),
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveSocietyRole(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const idRaw = String(formData.get("id") || "").trim();
    const { error } = await supabase.rpc("save_society_role", {
      p_id: idRaw ? Number(idRaw) : null,
      p_label: String(formData.get("label") || "").trim() || null,
      p_summary: String(formData.get("summary") || ""),
      p_enabled: idRaw ? formData.get("enabled") === "on" || formData.get("enabled") === "true" : true,
      p_maps_to: String(formData.get("maps_to") || "").trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setRoleTasks(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const roleKey = String(formData.get("role_key") || "").trim();
    const taskKeys = formData
      .getAll("task_key")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const { error } = await supabase.rpc("set_role_tasks", {
      p_role_key: roleKey,
      p_task_keys: taskKeys,
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setPersonExtraTasks(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const userId = String(formData.get("user_id") || "").trim();
    const taskKeys = formData
      .getAll("task_key")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const { error } = await supabase.rpc("set_person_extra_tasks", {
      p_user_id: userId,
      p_task_keys: taskKeys,
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveSocietyReminder(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const idRaw = String(formData.get("id") || "").trim();
    const userId = String(formData.get("user_id") || "").trim();
    const { error } = await supabase.rpc("save_society_reminder", {
      p_id: idRaw ? Number(idRaw) : null,
      p_task_key: String(formData.get("task_key") || "").trim() || null,
      p_user_id: userId || null,
      p_remind_at: atOrNull(formData.get("remind_at")),
      p_offset_minutes: Number(formData.get("offset_minutes") || 0),
      p_anchor: String(formData.get("anchor") || "absolute"),
      p_repeat: String(formData.get("repeat") || "none"),
      p_keep_informed: formData.get("keep_informed") !== "false",
      p_enabled: formData.get("enabled") !== "false",
    });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function flushDueReminders(): Promise<CatalogActionResult & { sent?: number }> {
  try {
    const supabase = await db();
    const { data, error } = await supabase.rpc("flush_due_society_reminders");
    if (error) throw new Error(error.message);
    revalidateCatalog();
    const sent =
      data && typeof data === "object" && "sent" in data
        ? Number((data as { sent: number }).sent)
        : 0;
    return { ok: true, sent };
  } catch (error) {
    return fail(error);
  }
}

export async function saveSocietyLabels(formData: FormData): Promise<CatalogActionResult> {
  try {
    const supabase = await db();
    const entries: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("label.")) continue;
      entries[key.slice("label.".length)] = String(value);
    }
    const { error } = await supabase.rpc("save_society_labels", { entries });
    if (error) throw new Error(error.message);
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
