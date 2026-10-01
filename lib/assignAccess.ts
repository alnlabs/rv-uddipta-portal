import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSuperAdmin, SUPER_ADMIN_NO_FLAT } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import type { AppRole } from "@/lib/roles";
import {
  isSocietyPerson,
  loadSocietyPeopleIndex,
} from "@/lib/societyPeople";
import type { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const FLAT_ROLES: AppRole[] = ["owner", "co_owner", "tenant"];

export async function assertSocietyPerson(admin: AdminClient, user: User) {
  if (isSuperAdmin(user)) return;
  const index = await loadSocietyPeopleIndex(admin);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const allowed = isSocietyPerson({
    userId: user.id,
    email: normalizeEmail(user.email),
    role: String(profile?.role || "visitor"),
    locked: false,
    index,
  });
  if (!allowed) {
    throw new Error(
      "Access can only be assigned to people already in the portal or in the owners / registration records.",
    );
  }
}

export async function applyPersonAccess(
  admin: AdminClient,
  input: {
    user: User
    role: AppRole
    flatNumber: string
    displayName: string
  },
) {
  if (isSuperAdmin(input.user)) {
    if (input.role !== "admin" || input.flatNumber) {
      throw new Error(SUPER_ADMIN_NO_FLAT);
    }
    const { error } = await admin.from("profiles").upsert({
      user_id: input.user.id,
      role: "admin",
      flat_id: null,
      display_name:
        input.displayName || input.user.email || "Super admin",
    });
    if (error) throw new Error(error.message);
    await admin.from("flats").update({ user_id: null }).eq("user_id", input.user.id);
    return;
  }

  let role = input.role;
  if (!["admin", "builder", "owner", "co_owner", "visitor", "tenant"].includes(role)) {
    throw new Error("Unknown access type");
  }

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role, flat_id")
    .eq("user_id", input.user.id)
    .maybeSingle();
  if (
    currentProfile?.role === "owner" &&
    currentProfile.flat_id &&
    (role !== "owner" || !input.flatNumber)
  ) {
    const { count } = await admin
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("flat_id", currentProfile.flat_id)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      throw new Error(
        "This flat needs at least one owner. Add another owner before changing this person.",
      );
    }
  }

  if (role === "owner") {
    if (!input.user.email) throw new Error("This person needs a verified email.");
  }

  let flatId: number | null = null;
  if (input.flatNumber) {
    const { data: flat, error: flatError } = await admin
      .from("flats")
      .select("id, user_id, flat_number")
      .eq("flat_number", input.flatNumber)
      .maybeSingle();
    if (flatError) throw new Error(flatError.message);
    if (!flat) throw new Error(`Flat ${input.flatNumber} is not in the brochure.`);
    flatId = flat.id;
    if (
      currentProfile?.role === "owner" &&
      currentProfile.flat_id &&
      currentProfile.flat_id !== flatId
    ) {
      const { count: ownersLeft } = await admin
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("flat_id", currentProfile.flat_id)
        .eq("role", "owner");
      if ((ownersLeft ?? 0) <= 1) {
        throw new Error(
          "This flat needs at least one owner. Add another owner before moving this person.",
        );
      }
    }
    if (role === "owner") {
      const { data: home } = await admin
        .from("flats")
        .select("phone, email")
        .eq("id", flat.id)
        .maybeSingle();
      if (!home?.phone || !(home.email || input.user.email)) {
        throw new Error("Add an email and a phone on Flats before this person can be the owner.");
      }
    }
    if (role === "co_owner") {
      const { count } = await admin
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("flat_id", flat.id)
        .eq("role", "owner");
      if ((count ?? 0) < 1) {
        throw new Error("This flat needs an owner before you can add family.");
      }
    }
    if (
      role === "owner" &&
      flat.user_id &&
      flat.user_id !== input.user.id
    ) {
      throw new Error(
        `${flat.flat_number} already has a linked Google login. Unlink it on Owners first.`,
      );
    }
  }

  if (FLAT_ROLES.includes(role) && !flatId) {
    throw new Error("Enter a flat for owner, co-owner, or tenant.");
  }
  if (role === "visitor") flatId = null;
  if ((role === "admin" || role === "builder") && !FLAT_ROLES.includes(role)) {
    flatId = null;
  }

  const { error } = await admin.from("profiles").upsert({
    user_id: input.user.id,
    role,
    flat_id: flatId,
    display_name:
      input.displayName ||
      (input.user.user_metadata?.full_name as string | undefined) ||
      input.user.email ||
      null,
  });
  if (error) throw new Error(error.message);

  await admin.from("flats").update({ user_id: null }).eq("user_id", input.user.id);
  if (role === "owner" && flatId) {
    const { error: linkError } = await admin
      .from("flats")
      .update({ user_id: input.user.id })
      .eq("id", flatId);
    if (linkError) throw new Error(linkError.message);
  }
}
