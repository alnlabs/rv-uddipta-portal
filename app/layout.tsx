import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OwnersShell } from "@/components/OwnersShell";
import { SiteHeader } from "@/components/SiteHeader";
import { isSuperAdmin } from "@/lib/admin";
import {
  canEditBuilder,
  canEditFlat,
  canManageAdmin,
} from "@/lib/roles";
import { getAuthState } from "@/lib/session";
import { createAdminClient } from "@/utils/supabase/admin";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RV Uddiipta — Owners Portal",
  description: "Private floor-wise owners portal for RV Uddiipta, Karmanghat — 238 homes.",
  appleWebApp: {
    capable: true,
    title: "UDDIIPTA",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b3a2f",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { user, profile, supabase } = await getAuthState();

  let flatNumber: string | null = null;
  let pendingApproval = false;
  let isAdmin = false;
  let builderEdit = false;
  let showMyFlat = false;
  let unreadNotifications = 0;
  let pendingApprovals = 0;

  if (user && profile) {
    const superAdmin = isSuperAdmin(user);
    isAdmin = canManageAdmin(profile.role, user);
    builderEdit = canEditBuilder(profile.role, user);
    showMyFlat = !superAdmin && canEditFlat(profile.role);

    const [{ data: ownFlat }, { count }] = await Promise.all([
      superAdmin
        ? Promise.resolve({ data: null as { flat_number: string } | null })
        : supabase
            .from("flats")
            .select("flat_number")
            .eq("user_id", user.id)
            .maybeSingle(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    if (!superAdmin) {
      flatNumber = ownFlat?.flat_number ?? null;
      if (flatNumber) showMyFlat = true;
    }
    unreadNotifications = count ?? 0;

    if (isAdmin) {
      const admin = createAdminClient();
      const { count: waiting } = await admin
        .from("registration_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      pendingApprovals = waiting ?? 0;
    }

    if (!flatNumber && !isAdmin) {
      const { data: request } = await supabase
        .from("registration_requests")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      pendingApproval = request?.status === "pending";
    }
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} antialiased ${
        user ? "app-shell" : "h-full"
      }`}
    >
      <body
        className={`flex flex-col text-[#14241c] ${
          user ? "h-full min-h-0" : "min-h-full"
        }`}
      >
        {user ? (
          <OwnersShell
            isAdmin={isAdmin}
            isSuperAdmin={Boolean(user && isSuperAdmin(user))}
            canEditBuilder={builderEdit}
            showMyFlat={showMyFlat}
            flatNumber={flatNumber}
            pendingApproval={pendingApproval}
            unreadNotifications={unreadNotifications}
            pendingApprovals={pendingApprovals}
            accountLabel={profile.displayName || user.email || null}
          >
            {children}
          </OwnersShell>
        ) : (
          <>
            <SiteHeader signedIn={false} />
            <main className="relative min-w-0 flex-1 overflow-x-clip">
              {children}
            </main>
            <footer className="relative hidden border-t border-[rgba(27,58,47,0.1)] px-4 py-8 text-sm text-[#3d5247] md:block md:px-8">
              RV Uddiipta · Karmanghat · {new Date().getFullYear()}
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
