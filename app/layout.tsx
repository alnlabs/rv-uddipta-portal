import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { isAdminUser } from "@/lib/admin";
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

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-[#14241c]">
        <SiteHeader signedIn={Boolean(user)} isAdmin={isAdminUser(user)} />
        <main className="relative flex-1 pb-24 md:pb-0">{children}</main>
        <footer className="relative hidden border-t border-[rgba(27,58,47,0.1)] px-4 py-8 text-sm text-[#3d5247] md:block md:px-8">
          RV Uddiipta · Karmanghat · {new Date().getFullYear()}
        </footer>
        <BottomNav signedIn={Boolean(user)} isAdmin={isAdminUser(user)} />
      </body>
    </html>
  );
}
