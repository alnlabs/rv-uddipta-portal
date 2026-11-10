import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/admin";
import { canEditBuilder } from "@/lib/roles";
import { canAccessAdminDesk, getAuthState } from "@/lib/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getAuthState();
  if (!user) return children;

  const admin = await canAccessAdminDesk();
  const builder = canEditBuilder(profile.role, user);
  const facility = profile.role === "facility";
  if (!admin && !builder && !facility) redirect("/");

  const workspace =
    isSuperAdmin(user) ? "Super admin" : admin ? "Admin" : facility ? "Facility" : "Builder";

  return (
    <div className="page-gutter w-full py-4 md:py-6">
      <p className="eyebrow mb-3">{workspace}</p>
      {children}
    </div>
  );
}
