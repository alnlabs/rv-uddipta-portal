import { redirect } from "next/navigation";
import { canEditBuilder, canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");

  const admin = canManageAdmin(profile.role, user);
  const builder = canEditBuilder(profile.role, user);
  if (!admin && !builder) redirect("/");

  return (
    <div className="page-gutter w-full py-5 md:py-8">{children}</div>
  );
}
