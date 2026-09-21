import type { User } from "@supabase/supabase-js";
import { OWNER_EMAIL_DOMAIN } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function adminPhones() {
  return (process.env.ADMIN_PHONES || "")
    .split(",")
    .map((value) => normalizePhone(value.trim()))
    .filter((value): value is string => Boolean(value));
}

export function phoneFromUser(user: User | null) {
  if (!user) return null;
  const fromMeta = normalizePhone(String(user.user_metadata?.phone || ""));
  if (fromMeta) return fromMeta;
  const email = user.email || "";
  const suffix = `@${OWNER_EMAIL_DOMAIN}`;
  if (email.endsWith(suffix)) {
    return normalizePhone(email.slice(0, -suffix.length));
  }
  return null;
}

export const SUPER_ADMIN_NO_FLAT =
  "Super admin accounts cannot own a society flat. Sign in with a different Google account for that home.";

export function isSuperAdminEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  return Boolean(value && adminEmails().includes(value));
}

export function isSuperAdminPhone(phone: string | null | undefined) {
  const value = normalizePhone(String(phone || ""));
  return Boolean(value && adminPhones().includes(value));
}

export function isSuperAdminContact(
  email: string | null | undefined,
  phone?: string | null,
) {
  return isSuperAdminEmail(email) || isSuperAdminPhone(phone);
}

export function isSuperAdmin(user: User | null) {
  if (!user) return false;
  if (isSuperAdminEmail(user.email)) return true;
  return isSuperAdminPhone(phoneFromUser(user));
}

/** @deprecated Use isSuperAdmin — env ADMIN_EMAILS / ADMIN_PHONES */
export const isAdminUser = isSuperAdmin;
