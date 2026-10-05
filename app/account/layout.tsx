import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/admin";
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

  const workspace = user && isSuperAdmin(user) ? "Super admin" : admin ? "Admin" : "Builder";

  return (
    <div className="page-gutter w-full py-4 md:py-6">
      <p className="eyebrow mb-3">{workspace}</p>
      {children}
    </div>
  );
}
