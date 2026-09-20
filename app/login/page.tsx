import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GoogleLogin from "@/components/GoogleLogin";
import { postLoginPath } from "@/lib/post-login";
import { createClient } from "@/utils/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
