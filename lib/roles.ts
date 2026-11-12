import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { normalizeEmail } from "@/lib/email";
import { createAdminClient } from "@/utils/supabase/admin";
import type { createClient } from "@/utils/supabase/server";

export type AppRole =
  | "admin"
  | "builder"
  | "owner"
  | "co_owner"
  | "visitor"
  | "tenant"
  | "committee"
  | "facility"
  | "staff"
  | "security";

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
  "committee",
  "facility",
  "staff",
  "security",
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

const OFFICE_ROLES: AppRole[] = ["admin", "builder", "committee", "facility", "staff", "security", "visitor"];

export function isOfficeRole(role: AppRole | null | undefined) {
  return Boolean(role && OFFICE_ROLES.includes(role) && role !== "visitor");
}

export function canRunGate(role: AppRole | null | undefined, _user: User | null) {
  return role === "security";
}

export function canRunFacility(role: AppRole | null | undefined, user: User | null) {
  return role === "facility" || canManageAdmin(role, user);
}

export function canDoStaffWork(role: AppRole | null | undefined, user: User | null) {
  return role === "staff" || canRunFacility(role, user);
}

export function canSitCommittee(role: AppRole | null | undefined, user: User | null) {
  return role === "committee" || canManageAdmin(role, user);
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

type FlatHome = {
  id: number
  owner_name: string | null
  user_id?: string | null
};

/** Resolve the sold unit this Google login should open (linked user_id, then owner email). */
async function findOwnedFlat(user: User): Promise<FlatHome | null> {
  const admin = createAdminClient();
  const { data: byUser } = await admin
    .from("flats")
    .select("id, owner_name, user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (byUser) return byUser;

  const email = normalizeEmail(user.email);
  if (!email) return null;

  const { data: matches } = await admin
    .from("flats")
    .select("id, owner_name, user_id, email")
    .eq("sale_status", "sold")
    .ilike("email", email)
    .limit(5);
  const open = (matches ?? []).filter(
    (row) => !row.user_id || row.user_id === user.id,
  );
  if (open.length !== 1) return null;

  const home = open[0];
  if (!home.user_id) {
    const { error } = await admin
      .from("flats")
      .update({ user_id: user.id })
      .eq("id", home.id)
      .is("user_id", null);
    if (error) return null;
  }
  return { id: home.id, owner_name: home.owner_name, user_id: user.id };
}

async function findHeldHomeRole(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("person_roles")
    .select("role, flat_id")
    .eq("user_id", userId)
    .in("role", ["owner", "co_owner", "tenant"])
    .not("flat_id", "is", null)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.flat_id) return null;
  return { role: data.role as AppRole, flatId: Number(data.flat_id) };
}

async function writeHomeProfile(
  user: User,
  input: {
    role: AppRole
    flatId: number
    displayName: string | null
  },
): Promise<Profile> {
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        role: input.role,
        flat_id: input.flatId,
        display_name: input.displayName,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, role, flat_id, display_name")
    .single();
  await admin.from("person_roles").upsert(
    { user_id: user.id, role: input.role, flat_id: input.flatId },
    { onConflict: "user_id,role" },
  );
  if (input.role === "owner") {
    await admin.from("flats").update({ user_id: user.id }).eq("id", input.flatId);
  }
  if (error || !inserted) {
    return {
      userId: user.id,
      role: input.role,
      flatId: input.flatId,
      displayName: input.displayName,
    };
  }
  return {
    userId: inserted.user_id,
    role: inserted.role as AppRole,
    flatId: inserted.flat_id,
    displayName: inserted.display_name,
  };
}

const DESK_ROLES = new Set([
  "admin",
  "builder",
  "committee",
  "facility",
  "staff",
  "security",
]);

/** Attach a home when the office already linked the flat but the profile is still visitor. */
async function healMissingHome(
  user: User,
  existing: {
    role: string
    flat_id: number | null
    display_name: string | null
  },
): Promise<Profile | null> {
  // Never demote society desk roles to owner because a flat email matches.
  if (DESK_ROLES.has(existing.role)) return null;
  if (existing.flat_id && existing.role !== "visitor") return null;

  const owned = await findOwnedFlat(user);
  if (owned) {
    return writeHomeProfile(user, {
      role: "owner",
      flatId: owned.id,
      displayName:
        existing.display_name
        || owned.owner_name
        || (user.user_metadata?.full_name as string | undefined)
        || user.email
        || null,
    });
  }

  const held = await findHeldHomeRole(user.id);
  if (!held) return null;
  return writeHomeProfile(user, {
    role: held.role,
    flatId: held.flatId,
    displayName:
      existing.display_name
      || (user.user_metadata?.full_name as string | undefined)
      || user.email
      || null,
  });
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
    const healed = await healMissingHome(user, existing);
    if (healed) return healed;
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

  const owned = await findOwnedFlat(user);
  const held = owned ? null : await findHeldHomeRole(user.id);
  const role: AppRole = owned ? "owner" : held?.role || "visitor";
  const flatId = owned?.id ?? held?.flatId ?? null;

  if (flatId && role !== "visitor") {
    return writeHomeProfile(user, {
      role,
      flatId,
      displayName:
        owned?.owner_name
        || (user.user_metadata?.ownerName as string | undefined)
        || (user.user_metadata?.full_name as string | undefined)
        || user.email
        || null,
    });
  }

  const admin = createAdminClient();
  const row = {
    user_id: user.id,
    role: "visitor" as const,
    flat_id: null as number | null,
    display_name:
      (user.user_metadata?.ownerName as string | undefined)
      || (user.user_metadata?.full_name as string | undefined)
      || user.email
      || null,
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
