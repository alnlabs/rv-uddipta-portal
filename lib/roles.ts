import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { createAdminClient } from "@/utils/supabase/admin";
import type { createClient } from "@/utils/supabase/server";

export type AppRole =
  | "admin"
  | "builder"
  | "owner"
  | "co_owner"
  | "visitor"
  | "tenant";

export type Profile = {
  userId: string
  role: AppRole
  flatId: number | null
  displayName: string | null
};

type ServerClient = ReturnType<typeof createClient>;

const COMMUNITY_ROLES: AppRole[] = [
  "admin",
  "builder",
  "owner",
  "co_owner",
  "tenant",
];

export function isCommunityRole(role: AppRole | null | undefined) {
  return Boolean(role && COMMUNITY_ROLES.includes(role));
}

export function canEditFlat(role: AppRole | null | undefined) {
  return role === "owner" || role === "co_owner";
}

export function canEditBuilder(role: AppRole | null | undefined, user: User | null) {
  return role === "admin" || role === "builder" || isSuperAdmin(user);
}

export function canManageAdmin(role: AppRole | null | undefined, user: User | null) {
  return role === "admin" || isSuperAdmin(user);
}

async function detachFlatFromUser(userId: string) {
  const admin = createAdminClient();
  const { data: linked } = await admin
    .from("flats")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (linked) {
    await admin.from("flats").update({ user_id: null }).eq("id", linked.id);
  }
  return admin;
}

export async function ensureProfile(
  user: User,
  userClient: ServerClient,
): Promise<Profile> {
  const { data: existing } = await userClient
    .from("profiles")
    .select("user_id, role, flat_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (isSuperAdmin(user)) {
      const admin = await detachFlatFromUser(user.id);
      if (existing.role !== "admin" || existing.flat_id != null) {
        await admin
          .from("profiles")
          .update({ role: "admin", flat_id: null })
          .eq("user_id", user.id);
      }
      return {
        userId: user.id,
        role: "admin",
        flatId: null,
        displayName: existing.display_name,
      };
    }
    return {
      userId: existing.user_id,
      role: existing.role as AppRole,
      flatId: existing.flat_id,
      displayName: existing.display_name,
    };
  }

  if (isSuperAdmin(user)) {
    const adminClient = await detachFlatFromUser(user.id);
    const row = {
      user_id: user.id,
      role: "admin" as const,
      flat_id: null,
      display_name:
        user.user_metadata?.full_name || user.email || "Super admin",
    };
    const { data: inserted, error } = await adminClient
      .from("profiles")
      .upsert(row, { onConflict: "user_id" })
      .select("user_id, role, flat_id, display_name")
      .single();
    if (error || !inserted) {
      return {
        userId: user.id,
        role: "admin",
        flatId: null,
        displayName: row.display_name,
      };
    }
    return {
      userId: inserted.user_id,
      role: "admin",
      flatId: null,
      displayName: inserted.display_name,
    };
  }

  const admin = createAdminClient();
  let role: AppRole = "visitor";

  const { data: owned } = await admin
    .from("flats")
    .select("id, owner_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (owned && role === "visitor") role = "owner";

  const row = {
    user_id: user.id,
    role,
    flat_id: owned?.id ?? null,
    display_name:
      owned?.owner_name ||
      user.user_metadata?.ownerName ||
      user.user_metadata?.full_name ||
      user.email ||
      null,
  };

  const { data: inserted, error } = await admin
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("user_id, role, flat_id, display_name")
    .single();

  if (error || !inserted) {
    return {
      userId: user.id,
      role: row.role,
      flatId: row.flat_id,
      displayName: row.display_name,
    };
  }

  return {
    userId: inserted.user_id,
    role: inserted.role as AppRole,
    flatId: inserted.flat_id,
    displayName: inserted.display_name,
  };
}
