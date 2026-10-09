import { isMember, mobileJson, readMobileMember } from "@/lib/mobileSession";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const member = await readMobileMember(request);
  if (!isMember(member)) return member;
  const body = await request.json().catch(() => null);
  const token = String(body?.token || "").trim();
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    return mobileJson({ message: "That is not a phone token." }, 400);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("device_tokens").upsert(
    { user_id: member.user.id, token },
    { onConflict: "token" },
  );
  if (error) return mobileJson({ message: "The phone token needs a database update before it can be kept." }, 503);
  return mobileJson({ ok: true });
}
