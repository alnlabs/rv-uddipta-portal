import Link from "next/link";
import { redirect } from "next/navigation";
import { canEditBuilder, canManageAdmin } from "@/lib/roles";
import { getAuthState } from "@/lib/session";

const TABS = [
  { href: "/admin", label: "Approvals", adminOnly: true },
  { href: "/admin/owners", label: "Owners", adminOnly: true },
  { href: "/admin/builder", label: "Builder", adminOnly: false },
  { href: "/admin/roles", label: "Roles", adminOnly: true },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/login");

  const admin = canManageAdmin(profile.role, user);
  const builder = canEditBuilder(profile.role, user);
  if (!admin && !builder) redirect("/");

  const tabs = TABS.filter((tab) => (tab.adminOnly ? admin : builder));

  return (
    <div className="page-gutter max-w-[1100px] py-6 md:py-10">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
        Manage portal
      </h1>
      <nav className="mt-5 flex flex-wrap gap-1 rounded-full border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]/90 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#3d5247] hover:bg-[rgba(27,58,47,0.06)] data-[active=true]:bg-[#1b3a2f] data-[active=true]:text-[#e8d5a3]"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
