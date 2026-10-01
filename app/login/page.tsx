import { redirect } from "next/navigation";
import GoogleLogin from "@/components/GoogleLogin";
import { postLoginPath } from "@/lib/post-login";
import { getAuthState } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user, supabase } = await getAuthState();

  if (user) {
    redirect(await postLoginPath(supabase, user));
  }

  const { error } = await searchParams;
  const message =
    error === "oauth"
      ? "Google sign-in failed. Try again."
      : error === "missing_code"
        ? "Google did not return a login code."
        : undefined;

  return <GoogleLogin error={message} />;
}
