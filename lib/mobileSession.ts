import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { resolveDeskAccess, type DeskAccess } from "@/lib/deskAccess";
import { ensureProfile, isCommunityRole, type Profile } from "@/lib/roles";
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

export async function readMobileMember(request: Request): Promise<MobileMember | Response> {
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

  const admin = createAdminClient();
  const profile = await ensureProfile(data.user, admin as never);
  if (!isCommunityRole(profile.role)) {
    return mobileJson({ message: "You can do this after your flat is approved." }, 403);
  }

  let flatNumber: string | null = null;
  if (profile.flatId) {
    const { data: flat } = await admin
      .from("flats")
      .select("flat_number")
      .eq("id", profile.flatId)
      .maybeSingle();
    flatNumber = flat?.flat_number ?? null;
  }

  return {
    user: data.user,
    profile,
    name: profile.displayName || data.user.email || "A member",
    flatNumber,
  };
}

export function isMember(value: MobileMember | Response): value is MobileMember {
  return !(value instanceof Response);
}

export async function desk(
  member: MobileMember,
  key: string,
): Promise<DeskAccess> {
  return resolveDeskAccess(member.profile.role, member.user, key);
}
