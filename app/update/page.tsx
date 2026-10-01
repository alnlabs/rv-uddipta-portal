import { redirect } from "next/navigation";
import { UpdateRedirect } from "@/components/UpdateRedirect";
import { isSuperAdmin } from "@/lib/admin";
import { getAuthState } from "@/lib/session";

export default async function UpdatePage() {
  const { user } = await getAuthState();

  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/account");

  return <UpdateRedirect />;
}
