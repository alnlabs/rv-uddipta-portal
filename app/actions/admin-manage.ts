"use server";

import { revalidatePath } from "next/cache";
import { normalizeSaleFields } from "@/lib/flatDisplay";
import { normalizePhone } from "@/lib/phone";
import type { AppRole } from "@/lib/roles";
import { requireAdminUser, requireBuilderEditor } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";

export async function adminSaveFlat(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const flatNumber = String(formData.get("flatNumber") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const saleStatus = String(formData.get("saleStatus") || "unsold") as "sold" | "unsold";
  const occupancy = String(formData.get("occupancy") || "") as "owner_stay" | "rented" | "";
  const tenantName = String(formData.get("tenantName") || "");
  const tenantPhone = normalizePhone(String(formData.get("tenantPhone") || "")) ?? "";
  const openForRent = formData.get("openForRent") === "on";
  const openForResale = formData.get("openForResale") === "on";
  const clearOwner = formData.get("clearOwner") === "1";
  const unlinkUser = formData.get("unlinkUser") === "1";

  if (!flatNumber) throw new Error("Flat required");

  if (clearOwner || saleStatus === "unsold") {
    const { error } = await admin
      .from("flats")
      .update({
        owner_name: null,
        phone: null,
        sale_status: "unsold",
        occupancy: null,
        tenant_name: null,
        tenant_phone: null,
        open_for_rent: false,
        open_for_resale: false,
        ...(unlinkUser || clearOwner ? { user_id: null } : {}),
      })
      .eq("flat_number", flatNumber);
    if (error) throw new Error(error.message);
  } else {
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
        ...(phone ? { phone } : {}),
        ...patch,
        ...(unlinkUser ? { user_id: null } : {}),
      })
      .eq("flat_number", flatNumber);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/owners");
  revalidatePath("/");
  revalidatePath("/community");
  revalidatePath("/model");
}

export async function adminSaveProfile(formData: FormData) {
  await requireAdminUser();
  const admin = createAdminClient();
  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "visitor") as AppRole;
  const flatNumber = String(formData.get("flatNumber") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();

  if (!userId) throw new Error("User required");

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
  if (["visitor"].includes(role)) flatId = null;

  const { error } = await admin.from("profiles").upsert({
    user_id: userId,
    role,
    flat_id: flatId,
    display_name: displayName || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/roles");
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

  revalidatePath("/admin/builder");
  revalidatePath("/");
}
