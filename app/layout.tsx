import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { OwnersShell } from "@/components/OwnersShell";
import { SiteHeader } from "@/components/SiteHeader";
import {
  canEditBuilder,
  canEditFlat,
  canManageAdmin,
  ensureProfile,
} from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";
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
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let flatNumber: string | null = null;
  let pendingApproval = false;
  let isAdmin = false;
  let builderEdit = false;
  let showMyFlat = false;
  let unreadNotifications = 0;

  if (user) {
    const profile = await ensureProfile(user, supabase);
    isAdmin = canManageAdmin(profile.role, user);
    builderEdit = canEditBuilder(profile.role, user);
    showMyFlat = canEditFlat(profile.role);

    const { data: ownFlat } = await supabase
      .from("flats")
      .select("flat_number")
      .eq("user_id", user.id)
      .maybeSingle();
    flatNumber = ownFlat?.flat_number ?? null;
    if (flatNumber) showMyFlat = true;

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

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unreadNotifications = count ?? 0;
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-[#14241c]">
        {user ? (
          <OwnersShell
            isAdmin={isAdmin}
            canEditBuilder={builderEdit}
            showMyFlat={showMyFlat}
            flatNumber={flatNumber}
            pendingApproval={pendingApproval}
            unreadNotifications={unreadNotifications}
          >
            {children}
          </OwnersShell>
        ) : (
          <>
            <SiteHeader signedIn={false} />
            <main className="relative flex-1">{children}</main>
            <footer className="relative hidden border-t border-[rgba(27,58,47,0.1)] px-4 py-8 text-sm text-[#3d5247] md:block md:px-8">
              RV Uddiipta · Karmanghat · {new Date().getFullYear()}
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
