import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/lib/admin";
import { resolveDeskAccess, type DeskAccess } from "@/lib/deskAccess";
import { resolveLinkedHome } from "@/lib/linkedHome";
import { canManageAdmin, ensureProfile, isCommunityRole, type Profile } from "@/lib/roles";
import { createAdminClient } from "@/utils/supabase/admin";

export type MobileMember = {
  user: User
  profile: Profile
  name: string
  flatNumber: string | null
};

export function mobileJson(body: unknown, status = 200) {
  return Response.json(body, { status });
}

async function readBearerUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return mobileJson({ message: "Sign in first." }, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return mobileJson({ message: "Sign-in is not ready." }, 500);

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return mobileJson({ message: "Sign in first." }, 401);
  return data.user;
}

/** Any signed-in Google account — including visitors waiting for flat approval. */
export async function readMobileAuth(request: Request): Promise<{ user: User; profile: Profile; name: string; flatNumber: string | null } | Response> {
  const user = await readBearerUser(request);
  if (user instanceof Response) return user;

  const admin = createAdminClient();
  const profile = await ensureProfile(user, admin as never);
  const home = await resolveLinkedHome({
    userId: user.id,
    flatId: profile.flatId,
    healProfile: true,
  });

  return {
    user,
    profile: home.flatId && home.flatId !== profile.flatId
      ? { ...profile, flatId: home.flatId }
      : profile,
    name: profile.displayName || user.email || "A member",
    flatNumber: home.flatNumber,
  };
}

export async function readMobileMember(request: Request): Promise<MobileMember | Response> {
  const auth = await readMobileAuth(request);
  if (auth instanceof Response) return auth;
  if (!isCommunityRole(auth.profile.role)) {
    return mobileJson({ message: "You can do this after your flat is approved." }, 403);
  }
  return auth;
}

export function isMember(value: MobileMember | Response): value is MobileMember {
  return !(value instanceof Response);
}

/** Held society admin — Manage works without forcing a role switch. */
export async function holdsSocietyAdmin(member: MobileMember): Promise<boolean> {
  if (isSuperAdmin(member.user) || canManageAdmin(member.profile.role, member.user)) return true;
  const admin = createAdminClient();
  const { data } = await admin
    .from("person_roles")
    .select("role")
    .eq("user_id", member.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

export async function desk(
  member: MobileMember,
  key: string,
): Promise<DeskAccess> {
  if (await holdsSocietyAdmin(member)) {
    return resolveDeskAccess("admin", member.user, key);
  }
  return resolveDeskAccess(member.profile.role, member.user, key);
}
