import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UpdateRedirect } from "@/components/UpdateRedirect";
import { isSuperAdmin } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";

export default async function UpdatePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/account");

  return <UpdateRedirect />;
}
