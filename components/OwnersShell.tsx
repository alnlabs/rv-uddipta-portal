"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/actions/auth";
import { switchRole } from "@/app/actions/community-os";
import { ApprovalWatcher } from "@/components/ApprovalWatcher";
import { Mark } from "@/components/Mark";

type NavItem = {
  href: string
  label: string
  short?: string
  match: (p: string) => boolean
  icon: "home" | "feed" | "floors" | "model" | "flat" | "admin" | "bell" | "people" | "mail" | "form"
};

function NavIcon({
  name,
  className = "size-4",
}: {
  name: NavItem["icon"]
  className?: string
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "feed":
      return (
        <svg {...common}>
          <path d="M5 7h14M5 12h14M5 17h9" />
        </svg>
      );
    case "floors":
      return (
        <svg {...common}>
          <path d="M4 20V8l8-4 8 4v12" />
          <path d="M9 20v-6h6v6" />
          <path d="M4 12h16" />
        </svg>
      );
    case "model":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
        </svg>
      );
    case "flat":
      return (
        <svg {...common}>
          <path d="M7 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
          <path d="M4 21h16M10 8h.01M14 8h.01M10 12h.01M14 12h.01M10 16h.01M14 16h.01" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6.5v4.2c0 4.6 3.1 8.9 7.5 10.3 4.4-1.4 7.5-5.7 7.5-10.3V6.5L12 3Z" />
          <path d="m9.5 12 1.8 1.8 3.7-3.8" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <path d="M16 19v-1.2A3.3 3.3 0 0 0 12.7 14.5H8.3A3.3 3.3 0 0 0 5 17.8V19" />
          <circle cx="10.5" cy="8.5" r="2.7" />
          <path d="M19 19v-1a2.8 2.8 0 0 0-2-2.7" />
          <path d="M15.2 8.6a2.4 2.4 0 1 0-1.3-4.4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 1 0-8.6 0v4.7L6.5 16.5Z" />
          <path d="M10 18.2a2 2 0 0 0 4 0" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <path d="M4 7h16v10H4V7Z" />
          <path d="m4 8 8 5 8-5" />
        </svg>
      );
    case "form":
      return (
        <svg {...common}>
          <path d="M8 4h6l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M14 4v4h4M9 13h6M9 17h6" />
        </svg>
      );
  }
}

function SidebarAccountCard({
  isSuperAdmin,
  canManage,
  accountLabel,
  flatNumber,
  pendingApproval,
}: {
  readonly isSuperAdmin: boolean
  readonly canManage: boolean
  readonly accountLabel: string | null
  readonly flatNumber: string | null
  readonly pendingApproval: boolean
}) {
  if (flatNumber) {
    return (
      <Link
        href="/"
        className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[rgba(5,150,105,0.22)] to-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ring-[rgba(226,232,240,0.16)]"
      >
        <p className="text-2xl font-semibold tracking-tight">{flatNumber}</p>
        <span className="mt-1 block text-xs font-semibold text-[#cbd5e1]">
          My flat →
        </span>
      </Link>
    );
  }

  if (pendingApproval) {
    return (
      <div className="relative mb-5 rounded-2xl bg-[rgba(5,150,105,0.12)] px-3.5 py-3.5 ring-1 ring-[rgba(5,150,105,0.2)]">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#059669] uppercase">
          Access
        </p>
        <p className="mt-1 text-sm font-semibold">Waiting for approval</p>
        <Link
          href="/register"
          className="mt-2 inline-block text-xs font-semibold text-[#f8fafc] underline underline-offset-2"
        >
          View request
        </Link>
      </div>
    );
  }

  if (isSuperAdmin || canManage) {
    return (
      <div className="relative mb-5 rounded-2xl bg-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ring-[rgba(226,232,240,0.16)]">
        <p className="text-sm font-semibold text-[#059669]">
          {isSuperAdmin ? "Super admin" : "Admin"}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">
          {accountLabel || "Account"}
        </p>
      </div>
    );
  }

  return (
    <Link
      href="/register"
      className="relative mb-5 rounded-2xl bg-[rgba(5,150,105,0.14)] px-3.5 py-3.5 text-sm font-semibold text-[#f8fafc] ring-1 ring-[rgba(5,150,105,0.22)]"
    >
      Link your flat →
    </Link>
  );
}

function SignOutSubmit({ className }: { readonly className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

function NotificationBell({
  count,
  tone,
}: {
  readonly count: number
  readonly tone: "dark" | "light"
}) {
  return (
    <Link
      href="/inbox"
      className={`relative grid size-10 shrink-0 place-items-center rounded-full ${
        tone === "dark"
          ? "text-[#f8fafc] hover:bg-white/8"
          : "text-[#1e293b] hover:bg-[rgba(15,23,42,0.06)]"
      }`}
      aria-label={count ? `${count} new notifications` : "Notifications"}
    >
      <NavIcon name="bell" className="size-5" />
      {count > 0 ? (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-[#059669] px-1 text-[10px] font-bold text-[#0f172a]">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function SignOutForm({ className }: { readonly className: string }) {
  return (
    <form action={signOut}>
      <SignOutSubmit className={className} />
    </form>
  );
}

export function OwnersShell({
  children,
  isAdmin = false,
  isSuperAdmin = false,
  canEditBuilder = false,
  showPrivateCommunity = false,
  flatNumber = null,
  pendingApproval = false,
  unreadNotifications = 0,
  pendingApprovals = 0,
  accountLabel = null,
  role = "visitor",
  heldRoles = [],
  enabledFeatures = null,
}: {
  children: React.ReactNode
  isAdmin?: boolean
  isSuperAdmin?: boolean
  canEditBuilder?: boolean
  showPrivateCommunity?: boolean
  flatNumber?: string | null
  pendingApproval?: boolean
  unreadNotifications?: number
  pendingApprovals?: number
  accountLabel?: string | null
  role?: string
  heldRoles?: { role: string; label: string }[]
  enabledFeatures?: string[] | null
}) {
  const pathname = usePathname();
  const router = useRouter();
  const canSwitch = isSuperAdmin || isAdmin || canEditBuilder;
  const canViewAs = isSuperAdmin;
  const [viewReady, setViewReady] = useState(false);
  const [viewAs, setViewAs] = useState<"manage" | "resident">("manage");
  const viewingResident = canViewAs && viewAs === "resident";

  useEffect(() => {
    const saved = window.localStorage.getItem("uddipta-view");
    if (saved === "resident") setViewAs("resident");
    setViewReady(true);
  }, []);

  function chooseView(next: "manage" | "resident") {
    setViewAs(next);
    window.localStorage.setItem("uddipta-view", next);
    router.push(next === "resident" ? "/feed" : "/account");
  }

  useEffect(() => {
    if (!viewReady || !isSuperAdmin || viewAs === "resident") return;
    const resident = [
      "feed",
      "announcements",
      "events",
      "polls",
      "forms",
      "f",
      "members",
      "inbox",
      "notifications",
      "messages",
      "community",
      "plans",
      "model",
      "visitors",
      "parking",
      "amenities",
      "documents",
      "work",
      "requests",
    ].some((root) => pathname === `/${root}` || pathname.startsWith(`/${root}/`));
    if (pathname === "/" || resident) router.replace("/account");
  }, [viewReady, isSuperAdmin, viewAs, pathname, router]);

  useEffect(() => {
    if (!viewReady || !canViewAs || viewAs !== "resident") return;
    if (pathname.startsWith("/account")) router.replace("/feed");
  }, [viewReady, canViewAs, viewAs, pathname, router]);
  const inAdmin = pathname.startsWith("/account");
  const adminHref = isSuperAdmin || isAdmin ? "/account" : "/account/builder";
  const seeCommunity = showPrivateCommunity || viewingResident;
  const ownersHome = seeCommunity ? "/feed" : "/";

  const featureOn = (key: string) => !enabledFeatures || enabledFeatures.includes(key);
  const office = isSuperAdmin || isAdmin;
  const canGate = office || role === "security";
  const canFacility = office || role === "facility";
  const canStaff = office || canFacility || role === "staff";
  const canCommittee = office || role === "committee";

  const ownerNav: NavItem[] = [];
  if (!isSuperAdmin) {
    ownerNav.push({ href: "/", label: "My flat", short: "Home", match: (p) => p === "/", icon: "flat" });
  }
  if (
    seeCommunity &&
    (featureOn("feed") || featureOn("announcements") || featureOn("events") || featureOn("polls"))
  ) {
    ownerNav.push({
      href: "/feed",
      label: "Updates",
      match: (p) => p.startsWith("/feed"),
      icon: "feed",
    });
  }
  if (featureOn("forms")) {
    ownerNav.push({
      href: "/forms",
      label: "Forms",
      match: (p) => p.startsWith("/forms") || p.startsWith("/f/"),
      icon: "form",
    });
  }
  if (seeCommunity && featureOn("neighbours")) {
    ownerNav.push({
      href: "/members",
      label: "Neighbours",
      match: (p) => p.startsWith("/members"),
      icon: "people",
    });
  }
  if (seeCommunity && featureOn("requests")) {
    ownerNav.push({
      href: "/requests",
      label: "My requests",
      short: "Requests",
      match: (p) => p === "/requests",
      icon: "mail",
    });
  }
  if (featureOn("inbox")) {
    ownerNav.push({
      href: "/inbox",
      label: "Inbox",
      match: (p) => p.startsWith("/inbox") || p.startsWith("/notifications") || p.startsWith("/messages"),
      icon: "mail",
    });
  }
  if (featureOn("building")) {
    ownerNav.push({
      href: "/community",
      label: "Building",
      match: (p) => p.startsWith("/community") || p.startsWith("/plans") || p.startsWith("/model"),
      icon: "floors",
    });
  }
  if (seeCommunity && featureOn("visitor_passes")) {
    ownerNav.push({
      href: "/visitors",
      label: "Visitor passes",
      short: "Visitors",
      match: (p) => p.startsWith("/visitors") || p.startsWith("/pass"),
      icon: "people",
    });
  }
  if (seeCommunity && featureOn("parking")) {
    ownerNav.push({
      href: "/parking",
      label: "Parking",
      match: (p) => p.startsWith("/parking"),
      icon: "flat",
    });
  }
  if (seeCommunity && featureOn("amenities")) {
    ownerNav.push({
      href: "/amenities",
      label: "Amenities",
      match: (p) => p.startsWith("/amenities"),
      icon: "floors",
    });
  }
  if (!isSuperAdmin && featureOn("documents")) {
    ownerNav.push({
      href: "/documents",
      label: "Home records",
      match: (p) => p.startsWith("/documents"),
      icon: "form",
    });
  }
  if (canGate && !viewingResident && featureOn("gate")) {
    ownerNav.push({
      href: "/gate",
      label: "Gate",
      match: (p) => p.startsWith("/gate"),
      icon: "admin",
    });
  }
  if (canStaff && featureOn("maintenance") && role === "staff") {
    ownerNav.push({
      href: "/work",
      label: "My work",
      short: "Work",
      match: (p) => p.startsWith("/work"),
      icon: "flat",
    });
  }
  if (canCommittee && !viewingResident && featureOn("committee")) {
    ownerNav.push({
      href: "/committee",
      label: "Committee",
      match: (p) => p.startsWith("/committee"),
      icon: "admin",
    });
  }

  const adminNav: NavItem[] = [];
  if (isSuperAdmin || isAdmin) {
    adminNav.push(
      {
        href: "/account",
        label: "New members",
        short: "Join",
        match: (p) => p === "/account",
        icon: "admin",
      },
      {
        href: "/account/owners",
        label: "Flats",
        match: (p) => p.startsWith("/account/owners"),
        icon: "flat",
      },
      {
        href: "/account/roles",
        label: "Roles",
        match: (p) => p.startsWith("/account/roles"),
        icon: "people",
      },
    );
  }
  if (isSuperAdmin || isAdmin) {
    adminNav.push(
      {
        href: "/account/requests",
        label: "Requests",
        match: (p) => p.startsWith("/account/requests"),
        icon: "bell",
      },
      {
        href: "/account/forms",
        label: "Forms",
        match: (p) => p.startsWith("/account/forms"),
        icon: "form",
      },
    );
  }
  if (isSuperAdmin || isAdmin || canEditBuilder) {
    adminNav.push({
      href: "/account/builder",
      label: "Building details",
      short: "Details",
      match: (p) => p.startsWith("/account/builder"),
      icon: "model",
    });
  }
  if ((office || role === "facility") && featureOn("maintenance")) {
    adminNav.push({
      href: "/account/jobs",
      label: "Jobs",
      match: (p) => p.startsWith("/account/jobs"),
      icon: "flat",
    });
  }
  if (office) {
    adminNav.push(
      {
        href: "/account/features",
        label: "Features",
        match: (p) => p.startsWith("/account/features"),
        icon: "model",
      },
      {
        href: "/account/categories",
        label: "Categories",
        match: (p) => p.startsWith("/account/categories"),
        icon: "form",
      },
      {
        href: "/account/permissions",
        label: "Permissions",
        match: (p) => p.startsWith("/account/permissions"),
        icon: "admin",
      },
      {
        href: "/account/audit",
        label: "Activity record",
        short: "Record",
        match: (p) => p.startsWith("/account/audit"),
        icon: "bell",
      },
      {
        href: "/account/reports",
        label: "Reports",
        match: (p) => p.startsWith("/account/reports"),
        icon: "feed",
      },
      {
        href: "/account/documents",
        label: "Home records",
        short: "Records",
        match: (p) => p.startsWith("/account/documents"),
        icon: "form",
      },
      ...(featureOn("parking")
        ? [
            {
              href: "/account/parking",
              label: "Parking",
              match: (p: string) => p.startsWith("/account/parking"),
              icon: "flat" as const,
            },
          ]
        : []),
    );
  }

  if (canViewAs && !viewingResident) {
    for (const href of ["/gate", "/committee"]) {
      const item = ownerNav.find((entry) => entry.href === href);
      if (item && !adminNav.some((entry) => entry.href === href)) adminNav.push(item);
    }
    ownerNav.length = 0;
  }
  if (viewingResident) adminNav.length = 0;

  const brandHref = viewingResident ? "/feed" : canViewAs ? "/account" : ownersHome;
  const pick = (href: string) => ownerNav.find((item) => item.href === href);
  const notificationBadge =
    unreadNotifications > 0 && !pathname.startsWith("/inbox") ? unreadNotifications : 0;

  const mobileItems: NavItem[] = (
    canViewAs
      ? viewingResident
        ? [pick("/"), pick("/feed"), pick("/community"), pick("/inbox"), pick("/forms")]
        : adminNav
      : inAdmin
      ? [
          {
            href: ownersHome,
            label: "Updates",
            match: (p: string) => p === ownersHome || p.startsWith("/feed"),
            icon: "feed" as const,
          },
          ...adminNav,
        ]
      : [
          pick("/"),
          pick("/feed"),
          pick("/community"),
          pick("/inbox"),
          pick("/forms"),
          ...(canSwitch
            ? [
                {
                  href: adminHref,
                  label: "Manage",
                  match: (p: string) => p.startsWith("/account"),
                  icon: "admin" as const,
                },
              ]
            : []),
        ]
  ).filter((item): item is NavItem => Boolean(item));

  function sideLink(item: NavItem) {
    const active = item.match(pathname);
    const badgeCount = item.href === "/account" ? pendingApprovals : 0;
    const showBadge = badgeCount > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
          active
            ? "bg-[rgba(5,150,105,0.16)] text-[#f8fafc]"
            : "text-[#cbd5e1] hover:bg-white/6 hover:text-[#f8fafc]"
        }`}
      >
        {active ? (
          <span
            className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#059669]"
            aria-hidden
          />
        ) : null}
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            active
              ? "bg-[#059669] text-[#0f172a]"
              : "bg-white/6 text-[#cbd5e1] group-hover:bg-white/10"
          }`}
        >
          <NavIcon name={item.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {showBadge ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-[#059669] px-1.5 py-0.5 text-[10px] font-bold text-[#0f172a]">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
      <aside className="relative z-30 hidden h-full w-[min(16.5rem,100%)] shrink-0 flex-col border-r border-[rgba(226,232,240,0.1)] bg-[#0f172a] px-3 py-4 text-[#f8fafc] md:flex">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 20% 0%, rgba(5,150,105,0.18), transparent 60%)",
          }}
        />

        <div className="relative mb-4 flex items-center gap-2 px-2">
          <Link href={brandHref} className="flex min-w-0 flex-1 items-center gap-3">
            <Mark size={40} />
            <span className="leading-tight">
              <strong className="block text-[0.95rem] tracking-[0.04em]">
                UDDIIPTA
              </strong>
              <span className="text-[0.68rem] font-medium tracking-[0.14em] text-[#94a3b8] uppercase">
                Community
              </span>
            </span>
          </Link>
          {isSuperAdmin && !viewingResident ? null : <NotificationBell count={notificationBadge} tone="dark" />}
        </div>

        <SidebarAccountCard
          isSuperAdmin={isSuperAdmin}
          canManage={canSwitch}
          accountLabel={accountLabel}
          flatNumber={flatNumber}
          pendingApproval={pendingApproval}
        />

        {canViewAs ? (
          <button
            type="button"
            onClick={() => chooseView(viewingResident ? "manage" : "resident")}
            className="relative mb-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-white/8 px-3 text-sm font-semibold text-[#f8fafc] ring-1 ring-white/15"
          >
            {viewingResident ? "Back to management" : "View as resident"}
          </button>
        ) : null}
        {heldRoles.length > 1 ? (
          <form action={switchRole} className="relative mb-4 px-1">
            <label className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#64748b] uppercase">
              Role
            </label>
            <select
              name="role"
              defaultValue={role}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="field-control mt-1 w-full"
            >
              {heldRoles.map((item) => (
                <option key={item.role} value={item.role}>
                  {item.label}
                </option>
              ))}
            </select>
          </form>
        ) : null}

        <nav className="scroll-on-dark relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {(
            [
              ["Community", ["/feed", "/forms", "/committee"]],
              ["Home", ["/", "/members", "/requests", "/documents"]],
              ["Communication", ["/inbox"]],
              ["Building", ["/community"]],
              ["Visitors", ["/visitors", "/gate"]],
              ["Parking", ["/parking"]],
              ["Services", ["/amenities", "/work"]],
            ] as const
          ).map(([label, hrefs]) => {
            const items = ownerNav.filter((item) => (hrefs as readonly string[]).includes(item.href));
            if (!items.length) return null;
            return (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-[#64748b] uppercase">
                  {label}
                </p>
                {items.map(sideLink)}
              </div>
            );
          })}
          {adminNav.length ? (
            <div className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-[#64748b] uppercase">
                Manage
              </p>
              {adminNav.map(sideLink)}
            </div>
          ) : null}
        </nav>

        <div className="relative mt-2 border-t border-[rgba(226,232,240,0.1)] pt-3">
          <SignOutForm className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#1e293b] px-4 text-lg font-semibold text-white ring-1 ring-white/15 disabled:opacity-60" />
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-20 shrink-0 border-b border-[rgba(15,23,42,0.1)] bg-[#f8fafc]/92 px-3 py-2 backdrop-blur-md md:hidden"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1">
              <Link href={brandHref} className="flex items-center gap-2">
                <Mark size={32} />
                <span className="text-sm font-semibold text-[#0f172a]">
                  {flatNumber || "UDDIIPTA"}
                </span>
              </Link>
              {isSuperAdmin && !viewingResident ? null : <NotificationBell count={notificationBadge} tone="light" />}
            </div>
            <div className="flex items-center gap-2">
              {canViewAs ? (
                <button
                  type="button"
                  onClick={() => chooseView(viewingResident ? "manage" : "resident")}
                  className="inline-flex min-h-12 items-center rounded-full px-3 text-sm font-semibold text-[#1e293b] ring-1 ring-[rgba(15,23,42,0.16)]"
                >
                  {viewingResident ? "Management" : "View as resident"}
                </button>
              ) : null}
              {heldRoles.length > 1 ? (
                <form action={switchRole}>
                  <select
                    name="role"
                    aria-label="Role"
                    defaultValue={role}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    className="field-control min-h-12 max-w-[9rem]"
                  >
                    {heldRoles.map((item) => (
                      <option key={item.role} value={item.role}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </form>
              ) : null}
              <SignOutForm className="inline-flex min-h-12 items-center rounded-full bg-[#1e293b] px-4 text-base font-semibold text-[#f8fafc] disabled:opacity-60" />
            </div>
          </div>
        </header>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {pendingApproval ? <ApprovalWatcher /> : null}
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(15,23,42,0.1)] bg-[#f8fafc]/96 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
          aria-label="Primary"
        >
          <div className="flex gap-1 overflow-x-auto px-2 py-2">
            {mobileItems.map((item) => {
              const active = item.match(pathname);
              const showBadge =
                (item.href === "/account" && pendingApprovals > 0) ||
                (item.href === adminHref && pendingApprovals > 0 && !inAdmin);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold ${
                    active ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#475569]"
                  }`}
                >
                  <NavIcon name={item.icon} className="size-4" />
                  <span className="max-w-full truncate">{item.short ?? item.label}</span>
                  {showBadge ? (
                    <span className="absolute top-1.5 right-[22%] size-2 rounded-full bg-[#059669]" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
