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

export function isAdminUser(user: User | null) {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  if (email && adminEmails().includes(email)) return true;
  const phone = phoneFromUser(user);
  return Boolean(phone && adminPhones().includes(phone));
}
