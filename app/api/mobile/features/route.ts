import { visibleDeskKeys } from "@/lib/deskAccess";
import { mobileJson, readMobileAuth } from "@/lib/mobileSession";
import { isCommunityRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await readMobileAuth(request);
  if (auth instanceof Response) return auth;
  if (!isCommunityRole(auth.profile.role)) {
    return mobileJson({ features: ["inbox", "announcements"] });
  }
  const enabled = await visibleDeskKeys(auth.profile.role, auth.user);
  return mobileJson({ features: enabled });
}
