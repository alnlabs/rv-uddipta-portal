"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({
  signedIn,
  isAdmin = false,
}: {
  signedIn: boolean
  isAdmin?: boolean
}) {
  const pathname = usePathname();

  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-2 text-xs font-semibold ${
        active ? "bg-[#1b3a2f] text-[#e8d5a3]" : "text-[#3d5247]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(27,58,47,0.1)] bg-[#efe8d8]/92 px-2 pt-2 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="flex gap-1">
        {item("/#floors", "Floors", pathname === "/")}
        {signedIn
          ? item("/community?view=3d", "3D", pathname.startsWith("/community"))
          : null}
        {signedIn
          ? item("/update", "My flat", pathname === "/update")
          : item("/login", "Login", pathname === "/login" || pathname === "/register")}
        {isAdmin ? item("/account", "Approvals", pathname === "/account") : null}
      </div>
    </nav>
  );
}
