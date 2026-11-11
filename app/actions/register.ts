"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSuperAdmin, SUPER_ADMIN_NO_FLAT } from "@/lib/admin";
import { findInventoryFlat } from "@/lib/inventory";
import {
  isHomeJoinKind,
  isJoinKind,
  isWorkJoinKind,
  pathForJoinKind,
  type JoinKind,
} from "@/lib/join";
import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type RegisterState = { ok: boolean; message: string };

export async function myRegistrationWatch(): Promise<{
  status: "pending" | "approved" | "rejected" | "none"
  flatNumber: string | null
  kind: string | null
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "none", flatNumber: null, kind: null };

  const { data } = await supabase
    .from("registration_requests")
    .select("status, flat_number, request_kind")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { status: "none", flatNumber: null, kind: null };
  if (data.status === "pending" || data.status === "approved" || data.status === "rejected") {
    return {
      status: data.status,
      flatNumber: data.flat_number,
      kind: data.request_kind ?? null,
    };
  }
  return { status: "none", flatNumber: data.flat_number, kind: data.request_kind ?? null };
}

export async function lookupSavedOwner(phoneRaw: string): Promise<{
  ownerName: string
  flatNumber: string
} | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || isSuperAdmin(user)) return null;

  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("flats")
    .select("flat_number, owner_name")
    .eq("phone", phone)
    .limit(1);
  const saved = data?.[0];
  if (error || !saved?.flat_number) return null;
  return {
    ownerName: String(saved.owner_name || "").trim(),
    flatNumber: saved.flat_number,
  };
}

export async function chooseBrowse(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/account");

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      joinIntent: "browse",
      registrationStatus: "browse",
    },
  });
  redirect("/");
}

export async function registerJoin(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in with Google first." };
  }
  if (isSuperAdmin(user)) {
    return { ok: false, message: SUPER_ADMIN_NO_FLAT };
  }

  const phone = normalizePhone(String(formData.get("phone") || ""));
  const ownerName = String(formData.get("ownerName") || "").trim();
  const whyNote = String(formData.get("whyNote") || "").trim();
  const requested = String(formData.get("kind") || "");
  if (!isJoinKind(requested)) {
    return { ok: false, message: "Pick who you are." };
  }
  const kind: JoinKind = requested;
  const path = pathForJoinKind(kind);
  const flatRaw = String(formData.get("flatNumber") || "").trim();
  const unit = flatRaw ? findInventoryFlat(flatRaw) : null;

  if (!user.email) {
    return { ok: false, message: "Your Google account needs an email." };
  }
  if (!phone) return { ok: false, message: "Enter a valid 10-digit phone number." };
  if (ownerName.length < 2) return { ok: false, message: "Your name is too short." };
  if (whyNote.length < 3) {
    return { ok: false, message: "Tell us briefly why you need access." };
  }
  if (isHomeJoinKind(kind) && !unit) {
    return { ok: false, message: "Enter a brochure flat such as A101 or B1004." };
  }
  if (flatRaw && !unit) {
    return { ok: false, message: "Enter a brochure flat such as A101 or B1004." };
  }

  const admin = createAdminClient();

  if (isHomeJoinKind(kind) && unit) {
    const { data: existingRows } = await admin
      .from("flats")
      .select("flat_number")
      .eq("phone", phone)
      .limit(1);
    const existingFlat = existingRows?.[0];
    if (existingFlat && existingFlat.flat_number !== unit.flatNumber) {
      return { ok: false, message: "This phone is already linked to an approved owner." };
    }

    const { data: claimed } = await admin
      .from("flats")
      .select("user_id, owner_name, email, phone")
      .eq("flat_number", unit.flatNumber)
      .maybeSingle();
    const flatHasOwner = Boolean(
      claimed?.user_id || (claimed?.owner_name && claimed?.email && claimed?.phone),
    );
    if (kind === "owner" && claimed?.user_id) {
      return { ok: false, message: `Flat ${unit.flatNumber} is already linked to an owner.` };
    }
    if (kind === "family" && !flatHasOwner) {
      return {
        ok: false,
        message: `Flat ${unit.flatNumber} needs an owner before family can join.`,
      };
    }

    const { data: ownFlat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownFlat) {
      return { ok: false, message: "This Google account is already an approved owner." };
    }
  }

  const { data: openRequest } = await admin
    .from("registration_requests")
    .select("id, status")
    .or(`phone.eq.${phone},user_id.eq.${user.id}`)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (openRequest?.status === "pending") {
    return { ok: false, message: "A registration is already waiting for admin approval." };
  }
  if (openRequest?.status === "approved") {
    return { ok: false, message: "This account is already approved." };
  }

  if (kind === "owner" && unit) {
    const { data: openFlat } = await admin
      .from("registration_requests")
      .select("id")
      .eq("flat_number", unit.flatNumber)
      .eq("status", "pending")
      .eq("request_kind", "owner")
      .maybeSingle();
    if (openFlat) {
      return { ok: false, message: `Flat ${unit.flatNumber} already has a pending owner request.` };
    }
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      phone,
      flatNumber: unit?.flatNumber || null,
      ownerName,
      registrationStatus: "pending",
      joinIntent: path,
    },
  });

  const { error } = await admin.from("registration_requests").insert({
    user_id: user.id,
    email: user.email,
    phone,
    owner_name: ownerName,
    flat_number: unit?.flatNumber ?? null,
    floor: unit?.floor ?? null,
    unit: unit?.unit ?? null,
    type: unit?.type ?? null,
    status: "pending",
    request_kind: kind,
    intent_path: path,
    why_note: whyNote,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/register");
}

/** @deprecated Prefer registerJoin — kept for older form posts. */
export async function registerOwner(
  prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  if (!formData.get("whyNote")) {
    formData.set("whyNote", "Requesting access to my flat.");
  }
  if (!formData.get("path")) {
    const kind = String(formData.get("kind") || "owner");
    formData.set("path", isWorkJoinKind(kind) ? "work" : "home");
  }
  return registerJoin(prev, formData);
}
