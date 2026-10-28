import { type NextRequest } from "next/server";
import { expoReturnUrl, handoffResponse } from "@/lib/phoneHandoff";
import { updateSession } from "@/utils/supabase/middleware";

function clientHost(request: NextRequest) {
  const header = request.headers.get("host")?.split(":")[0];
  if (header && header !== "0.0.0.0") return header;
  const hostname = request.nextUrl.hostname;
  if (hostname && hostname !== "0.0.0.0") return hostname;
  return "";
}

export async function proxy(request: NextRequest) {
  const host = clientHost(request);
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.get("code") && host && host !== "localhost") {
    return handoffResponse(expoReturnUrl(host, searchParams));
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
