import { redirect } from "next/navigation";
import GoogleLogin from "@/components/GoogleLogin";
import { safeNextPath } from "@/lib/enquiries";
import { postLoginPath } from "@/lib/post-login";
import { getAuthState } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { user, supabase } = await getAuthState();
  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (user) {
    redirect(next ?? (await postLoginPath(supabase, user)));
  }

  const { error } = params;
  const message =
    error === "oauth"
      ? "Google sign-in failed. Try again."
      : error === "missing_code"
        ? "Google did not return a login code."
        : undefined;

  return <GoogleLogin error={message} next={next ?? undefined} />;
}
