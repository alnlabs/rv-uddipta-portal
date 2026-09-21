"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions/admin";
import {
  isSuperAdmin,
  isSuperAdminContact,
  SUPER_ADMIN_NO_FLAT,
} from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import { normalizeSaleFields } from "@/lib/flatDisplay";
import { normalizePhone } from "@/lib/phone";
import type { AppRole } from "@/lib/roles";
import { requireAdminUser, requireBuilderEditor } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

function typedMatch(input: string, expected: string) {
  return input.trim().toUpperCase() === expected.trim().toUpperCase();
}

function revalidateOwnerSurfaces() {
  revalidatePath("/account");
  revalidatePath("/account/owners");
  revalidatePath("/account/roles");
  revalidatePath("/");
  revalidatePath("/community");
  revalidatePath("/members");
  revalidatePath("/model");
  revalidatePath("/update");
}

function assertNotSuperAdminOwner(
  email: string | null,
  phone: string | null | undefined,
) {
  if (isSuperAdminContact(email, phone)) {
    throw new Error(
      "Super admin email or phone cannot be saved as a society owner. Use the resident's personal account.",
    );
  }
}

export async function adminSaveFlat(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const flatNumber = String(formData.get("flatNumber") || "").trim().toUpperCase();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const emailRaw = String(formData.get("email") || "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (emailRaw && !email) throw new Error("Enter a valid email address");
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const saleStatus = String(formData.get("saleStatus") || "unsold") as
    | "sold"
    | "unsold";
  const occupancy = String(formData.get("occupancy") || "") as
    | "owner_stay"
    | "rented"
    | "";
  const tenantName = String(formData.get("tenantName") || "");
  const tenantPhone = normalizePhone(String(formData.get("tenantPhone") || "")) ?? "";
  const openForRent = formData.get("openForRent") === "on";
  const openForResale = formData.get("openForResale") === "on";

  if (!flatNumber) throw new Error("Flat required");
  if (formData.get("clearOwner") === "1") {
    throw new Error(`Use Safe release and type ${flatNumber} to clear this owner.`);
  }

  const { data: current, error: loadError } = await admin
    .from("flats")
    .select("id, sale_status")
    .eq("flat_number", flatNumber)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!current) throw new Error(`Flat ${flatNumber} is not in the brochure inventory`);

  if (saleStatus === "unsold") {
    if (current.sale_status === "sold") {
      throw new Error(
        `Use Safe release and type ${flatNumber} to mark this unit unsold. The brochure row is never deleted.`,
      );
    }
    revalidateOwnerSurfaces();
    return;
  }

  assertNotSuperAdminOwner(email, phone);

  const patch = normalizeSaleFields({
    saleStatus: "sold",
    occupancy: occupancy === "rented" ? "rented" : "owner_stay",
    tenantName,
    tenantPhone,
    openForRent,
    openForResale,
  });
  const { error } = await admin
    .from("flats")
    .update({
      owner_name: ownerName || null,
      email,
      ...(phone ? { phone } : {}),
      ...patch,
    })
    .eq("flat_number", flatNumber);
  if (error) throw new Error(error.message);

  revalidateOwnerSurfaces();
}

export async function adminUnlinkFlatUser(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const admin = createAdminClient();
    const flatNumber = String(formData.get("flatNumber") || "")
      .trim()
      .toUpperCase();
    const confirm = String(formData.get("confirm") || "");
    if (!flatNumber) throw new Error("Flat required");
    if (!typedMatch(confirm, "UNLINK")) {
      throw new Error("Type UNLINK to detach the Google login.");
    }

    const { data: flat, error: loadError } = await admin
      .from("flats")
      .select("id, user_id")
      .eq("flat_number", flatNumber)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!flat) throw new Error(`Flat ${flatNumber} is not in the brochure inventory`);
    if (!flat.user_id) throw new Error("No Google account is linked to this unit.");

    const { error } = await admin
      .from("flats")
      .update({ user_id: null })
      .eq("id", flat.id);
    if (error) throw new Error(error.message);

    await admin
      .from("profiles")
      .update({ role: "visitor", flat_id: null })
      .eq("user_id", flat.user_id)
      .eq("flat_id", flat.id);

    revalidateOwnerSurfaces();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adminReleaseFlat(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const admin = createAdminClient();
    const flatNumber = String(formData.get("flatNumber") || "")
      .trim()
      .toUpperCase();
    const confirm = String(formData.get("confirm") || "");
    if (!flatNumber) throw new Error("Flat required");
    if (!typedMatch(confirm, flatNumber)) {
      throw new Error(`Type ${flatNumber} to release this unit.`);
    }

    const { data: flat, error: loadError } = await admin
      .from("flats")
      .select("id, user_id")
      .eq("flat_number", flatNumber)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!flat) throw new Error(`Flat ${flatNumber} is not in the brochure inventory`);

    const { error } = await admin
      .from("flats")
      .update({
        owner_name: null,
        email: null,
        phone: null,
        sale_status: "unsold",
        occupancy: null,
        tenant_name: null,
        tenant_phone: null,
        open_for_rent: false,
        open_for_resale: false,
        user_id: null,
      })
      .eq("id", flat.id);
    if (error) throw new Error(error.message);

    await admin
      .from("profiles")
      .update({ role: "visitor", flat_id: null })
      .eq("flat_id", flat.id);

    revalidateOwnerSurfaces();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adminWipeHousehold(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const admin = createAdminClient();
    const flatNumber = String(formData.get("flatNumber") || "")
      .trim()
      .toUpperCase();
    const confirm = String(formData.get("confirm") || "");
    const expected = `WIPE ${flatNumber}`;
    if (!flatNumber) throw new Error("Flat required");
    if (!typedMatch(confirm, expected)) {
      throw new Error(`Type ${expected} to remove household rows. The unit stays.`);
    }

    const { data: flat, error: loadError } = await admin
      .from("flats")
      .select("id")
      .eq("flat_number", flatNumber)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!flat) throw new Error(`Flat ${flatNumber} is not in the brochure inventory`);

    const [{ error: membersError }, { error: rentersError }] = await Promise.all([
      admin.from("flat_members").delete().eq("flat_id", flat.id),
      admin.from("flat_renters").delete().eq("flat_id", flat.id),
    ]);
    if (membersError) throw new Error(membersError.message);
    if (rentersError) throw new Error(rentersError.message);

    revalidateOwnerSurfaces();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adminSaveProfile(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "visitor") as AppRole;
  const flatNumber = String(formData.get("flatNumber") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();

  if (!userId) throw new Error("User required");

  const { data: account } = await admin.auth.admin.getUserById(userId);
  if (account.user && isSuperAdmin(account.user)) {
    if (role !== "admin" || flatNumber) {
      throw new Error(SUPER_ADMIN_NO_FLAT);
    }
    const { error } = await admin.from("profiles").upsert({
      user_id: userId,
      role: "admin",
      flat_id: null,
      display_name: displayName || account.user.email || "Super admin",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/account/roles");
    return;
  }

  let flatId: number | null = null;
  if (flatNumber) {
    const { data: flat } = await admin
      .from("flats")
      .select("id")
      .eq("flat_number", flatNumber)
      .maybeSingle();
    flatId = flat?.id ?? null;
    if (!flatId) throw new Error(`Flat ${flatNumber} not found`);
  }

  if (["owner", "co_owner", "tenant"].includes(role) && !flatId) {
    throw new Error("Flat required for this role");
  }
  if (role === "visitor") flatId = null;

  const { error } = await admin.from("profiles").upsert({
    user_id: userId,
    role,
    flat_id: flatId,
    display_name: displayName || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/account/roles");
}

export async function adminResetProfile(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminUser();
    const admin = createAdminClient();
    const userId = String(formData.get("userId") || "").trim();
    const confirm = String(formData.get("confirm") || "").trim().toLowerCase();
    if (!userId) throw new Error("User required");

    const { data: account } = await admin.auth.admin.getUserById(userId);
    const user = account.user;
    if (!user) throw new Error("Account not found");
    if (isSuperAdmin(user)) {
      throw new Error("Super admin access cannot be reset from this screen.");
    }
    const email = (user.email || "").trim().toLowerCase();
    if (!email || confirm !== email) {
      throw new Error("Type the account email to reset their portal role.");
    }

    await admin.from("flats").update({ user_id: null }).eq("user_id", userId);
    const { error } = await admin.from("profiles").upsert({
      user_id: userId,
      role: "visitor",
      flat_id: null,
      display_name:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        null,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/account/roles");
    revalidatePath("/account/owners");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adminSaveBuilder(formData: FormData) {
  await requireBuilderEditor();
  const admin = createAdminClient();
  const amenities = String(formData.get("amenities") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const nearbyRaw = String(formData.get("nearby") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, distance] = line.split("|").map((p) => p.trim());
      return { label: label || line, distance: distance || "" };
    });

  const { error } = await admin.from("project_info").upsert({
    id: 1,
    name: String(formData.get("name") || "").trim(),
    developer: String(formData.get("developer") || "").trim(),
    tagline: String(formData.get("tagline") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    acres: Number(formData.get("acres") || 0),
    units: Number(formData.get("units") || 0),
    floors: Number(formData.get("floors") || 0),
    rera: String(formData.get("rera") || "").trim(),
    igbc: String(formData.get("igbc") || "").trim(),
    clubhouse_sqft: Number(formData.get("clubhouseSqft") || 0),
    greenery_facing_percent: Number(formData.get("greeneryFacingPercent") || 0),
    amenities,
    nearby: nearbyRaw,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/account/builder");
  revalidatePath("/");
}
