import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { OWNER_EMAIL_DOMAIN } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { roleLabel } from "@/lib/roleLabels";
import type { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const SOCIETY = ["admin", "builder", "committee", "facility", "staff", "security"] as const;
const HOMES = ["owner", "co_owner", "tenant"] as const;

const CATALOG = SOCIETY.map((value) => ({
  value,
  label: roleLabel(value),
}));

function phoneFromEmail(email: string | null | undefined) {
  const value = String(email || "").trim().toLowerCase();
  const suffix = `@${OWNER_EMAIL_DOMAIN.toLowerCase()}`;
  if (!value.endsWith(suffix)) return null;
  return normalizePhone(value.slice(0, -suffix.length));
}

function phoneFromMeta(meta: Record<string, unknown> | undefined) {
  const raw = meta?.phone;
  return normalizePhone(raw == null ? "" : String(raw));
}

function niceName(input: {
  displayName: string | null
  role: string
  phone: string | null
  email: string
}) {
  const display = String(input.displayName || "").trim();
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(display);
  const digitsOnly = /^\d+$/.test(display);
  if (display && !uuidLike && !digitsOnly) return display;

  const label = roleLabel(input.role);
  if (SOCIETY.includes(input.role as (typeof SOCIETY)[number])) {
    if (input.phone) return `${label} ${input.phone.slice(-4)}`;
    return label;
  }
  if (input.phone) return input.phone;
  const local = input.email.split("@")[0] || "";
  if (/[A-Za-z]/.test(local)) {
    return local.replace(/[._+]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Team member";
}

async function enabledOfficeRoles(admin: AdminClient) {
  const { data } = await admin
    .from("project_info")
    .select("office_roles")
    .eq("id", 1)
    .maybeSingle();
  const raw = data?.office_roles;
  const picked = Array.isArray(raw)
    ? raw.map((item) => String(item)).filter((item) => SOCIETY.includes(item as (typeof SOCIETY)[number]))
    : [...SOCIETY];
  if (!picked.includes("admin")) picked.unshift("admin");
  return picked.length ? picked : [...SOCIETY];
}

async function actorIsSocietyAdmin(admin: AdminClient, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (String(profile?.role || "") === "admin") return true;
  const { data: held } = await admin
    .from("person_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(held);
}

/** Admin-client people list — same source create uses, so Security/Staff always appear. */
export async function listOfficePeopleDesk(admin: AdminClient, actor: User) {
  const superActor = isSuperAdmin(actor);
  if (!superActor && !(await actorIsSocietyAdmin(admin, actor.id))) {
    throw new Error("Only admin can manage team people.");
  }

  const enabled = await enabledOfficeRoles(admin);
  const roles = CATALOG.filter((item) => (
    enabled.includes(item.value) && (superActor || item.value !== "admin")
  ));

  const { data: societyProfiles, error: societyError } = await admin
    .from("profiles")
    .select("user_id, role, display_name, flat_id")
    .in("role", [...SOCIETY]);
  if (societyError) throw new Error(societyError.message);

  const { data: homeProfiles, error: homeError } = await admin
    .from("profiles")
    .select("user_id, role, display_name, flat_id")
    .in("role", [...HOMES]);
  if (homeError) throw new Error(homeError.message);

  const { data: heldRows, error: heldError } = await admin
    .from("person_roles")
    .select("user_id, role, flat_id")
    .in("role", [...SOCIETY, ...HOMES]);
  if (heldError) throw new Error(heldError.message);

  const byId = new Map<string, {
    userId: string
    role: string
    displayName: string | null
    flatId: number | null
    heldRoles: Set<string>
  }>();

  function touch(row: {
    user_id: string
    role: string | null
    display_name?: string | null
    flat_id?: number | null
  }, heldOnly = false) {
    const userId = String(row.user_id || "");
    if (!userId || userId === actor.id) return;
    const current = byId.get(userId) || {
      userId,
      role: "visitor",
      displayName: null as string | null,
      flatId: null as number | null,
      heldRoles: new Set<string>(),
    };
    if (!heldOnly) {
      current.role = String(row.role || current.role || "visitor");
      if (row.display_name != null) current.displayName = String(row.display_name);
      if (row.flat_id != null) current.flatId = Number(row.flat_id);
    }
    if (row.role) current.heldRoles.add(String(row.role));
    byId.set(userId, current);
  }

  // Homes first, society last so desk role wins as the primary role.
  for (const row of homeProfiles || []) touch(row);
  for (const row of societyProfiles || []) touch(row);
  for (const row of heldRows || []) {
    touch({
      user_id: row.user_id,
      role: row.role,
      flat_id: row.flat_id,
    }, true);
    const current = byId.get(String(row.user_id));
    if (
      current
      && SOCIETY.includes(String(row.role) as (typeof SOCIETY)[number])
      && !SOCIETY.includes(current.role as (typeof SOCIETY)[number])
    ) {
      current.role = String(row.role);
    }
  }

  const flatIds = [...new Set(
    [...byId.values()].map((item) => item.flatId).filter((id): id is number => id != null),
  )];
  const flatMap = new Map<string, string>();
  if (flatIds.length) {
    const { data: flats } = await admin
      .from("flats")
      .select("id, flat_number")
      .in("id", flatIds);
    for (const flat of flats || []) {
      flatMap.set(String(flat.id), String(flat.flat_number));
    }
  }

  const authById = new Map<string, User>();
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const user of data.users) authById.set(user.id, user);
    if (data.users.length < 200) break;
  }

  const people = [];
  for (const item of byId.values()) {
    const user = authById.get(item.userId);
    if (!user) continue;
    const email = String(user.email || "");
    const phone = phoneFromEmail(email)
      || phoneFromMeta((user.user_metadata || {}) as Record<string, unknown>);
    const role = item.role || "visitor";
    const office = SOCIETY.includes(role as (typeof SOCIETY)[number])
      || [...item.heldRoles].some((value) => SOCIETY.includes(value as (typeof SOCIETY)[number]));
    const heldRoles = [...item.heldRoles].sort();
    people.push({
      user_id: item.userId,
      name: niceName({
        displayName: item.displayName,
        role,
        phone,
        email,
      }),
      email,
      phone,
      role,
      role_label: roleLabel(role),
      flat_number: item.flatId != null ? (flatMap.get(String(item.flatId)) || null) : null,
      office,
      held_roles: heldRoles,
    });
  }

  people.sort((a, b) => {
    const rank = (row: typeof a) => (row.office ? 1 : row.flat_number ? 2 : 3);
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  return {
    roles,
    people,
    can_assign_admin: superActor,
    enabled_roles: enabled,
    catalog: CATALOG,
  };
}
