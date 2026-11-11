import "server-only";

import type { User } from "@supabase/supabase-js";
import { phoneToEmail } from "@/lib/auth";
import { isSuperAdmin, isSuperAdminContact } from "@/lib/admin";
import { applyPersonAccess } from "@/lib/assignAccess";
import { normalizeEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/phone";
import { roleLabel } from "@/lib/roleLabels";
import type { AppRole } from "@/lib/roles";
import type { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const SOCIETY_TEAM_ROLES = new Set<AppRole>([
  "builder",
  "committee",
  "facility",
  "staff",
  "security",
]);

const OFFICE_ROLES = new Set<AppRole>(["admin", ...SOCIETY_TEAM_ROLES]);

function normalizePin(raw: string) {
  const pin = String(raw || "").replace(/\D/g, "");
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must be 4 to 6 digits.");
  }
  return pin;
}

async function enabledOfficeRoles(admin: AdminClient) {
  const { data } = await admin
    .from("project_info")
    .select("office_roles")
    .eq("id", 1)
    .maybeSingle();
  const raw = data?.office_roles;
  const picked = Array.isArray(raw)
    ? raw.map((item) => String(item)).filter(Boolean)
    : ["admin", "builder", "committee", "facility", "staff", "security"];
  if (!picked.includes("admin")) picked.unshift("admin");
  return picked;
}

async function findAuthUserByEmail(admin: AdminClient, email: string) {
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => (user.email || "").trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function resolveOrCreateStaffUser(
  admin: AdminClient,
  input: {
    loginEmail: string
    phone: string
    pin: string
    displayName: string
    contactEmail: string | null
  },
) {
  const metadata = {
    phone: input.phone,
    full_name: input.displayName || undefined,
    name: input.displayName || undefined,
    contact_email: input.contactEmail || undefined,
  };

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.loginEmail,
    password: input.pin,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created?.user) return { user: created.user, created: true as const };

  const already = /already|registered|exists|duplicate/i.test(error?.message || "");
  if (!already) throw new Error(error?.message || "Could not create that account.");

  const existing = await findAuthUserByEmail(admin, input.loginEmail);
  if (!existing) {
    throw new Error("That phone is already registered but could not be loaded.");
  }

  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: input.pin,
    user_metadata: {
      ...(existing.user_metadata || {}),
      ...metadata,
    },
  });
  if (updateError) throw new Error(updateError.message);
  return { user: updated.user, created: false as const };
}

/** Create or update staff with phone + PIN. Email is optional contact only. OTP can replace PIN later. */
export async function provisionOfficeUser(
  admin: AdminClient,
  input: {
    actor: User
    phone: string
    pin: string
    role: string
    displayName?: string
    email?: string
  },
) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Enter a valid 10-digit phone number.");
  if (isSuperAdminContact(null, phone)) {
    throw new Error("That phone is reserved for platform admin.");
  }

  const pin = normalizePin(input.pin);
  const contactEmail = input.email ? normalizeEmail(input.email) : null;
  if (input.email && !contactEmail) throw new Error("Enter a valid email address, or leave it blank.");
  if (contactEmail && isSuperAdminContact(contactEmail)) {
    throw new Error("That email is reserved for platform admin.");
  }

  const role = String(input.role || "").trim() as AppRole;
  if (!OFFICE_ROLES.has(role)) {
    throw new Error("Pick a society role type (security, facility, staff, and so on).");
  }

  const superActor = isSuperAdmin(input.actor);
  if (role === "admin" && !superActor) {
    throw new Error("Only a super admin can create a society admin.");
  }
  if (!superActor && !SOCIETY_TEAM_ROLES.has(role)) {
    throw new Error("Only a super admin can assign society admin.");
  }

  const enabled = await enabledOfficeRoles(admin);
  if (!enabled.includes(role)) {
    throw new Error(`${roleLabel(role)} is not enabled for this society.`);
  }

  const displayName = String(input.displayName || "").trim();
  const label = roleLabel(role);
  const shownName = displayName || `${label} ${phone.slice(-4)}`;
  const loginEmail = phoneToEmail(phone);
  const { user, created } = await resolveOrCreateStaffUser(admin, {
    loginEmail,
    phone,
    pin,
    displayName: shownName,
    contactEmail,
  });
  if (isSuperAdmin(user)) {
    throw new Error("A super admin account cannot be changed here.");
  }
  if (user.id === input.actor.id) {
    throw new Error("You cannot change your own role here.");
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (String(targetProfile?.role || "") === "admin" && !superActor) {
    throw new Error("Only a super admin can change a society admin.");
  }

  await applyPersonAccess(admin, {
    user,
    role,
    flatNumber: "",
    displayName: shownName,
  });

  return {
    ok: true as const,
    created,
    userId: user.id,
    phone,
    email: contactEmail,
    role,
    roleLabel: label,
    message: created
      ? `${label} created (${phone}). They sign in with phone + PIN. Find them under People → ${label}.`
      : `${label} updated (${phone}). They sign in with phone + PIN.`,
  };
}
