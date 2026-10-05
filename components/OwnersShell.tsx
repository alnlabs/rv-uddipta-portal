"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/actions/auth";
import { ApprovalWatcher } from "@/components/ApprovalWatcher";

type NavItem = {
  href: string
  label: string
  short?: string
  match: (p: string) => boolean
  icon: "home" | "feed" | "floors" | "model" | "flat" | "admin" | "bell" | "people"
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
        className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[rgba(201,164,92,0.22)] to-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ring-[rgba(232,213,163,0.16)]"
      >
        <p className="text-2xl font-semibold tracking-tight">{flatNumber}</p>
        <span className="mt-1 block text-xs font-semibold text-[#cbb98a]">
          My flat →
        </span>
      </Link>
    );
  }

  if (pendingApproval) {
    return (
      <div className="relative mb-5 rounded-2xl bg-[rgba(201,164,92,0.12)] px-3.5 py-3.5 ring-1 ring-[rgba(201,164,92,0.2)]">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
          Access
        </p>
        <p className="mt-1 text-sm font-semibold">Waiting for approval</p>
        <Link
          href="/register"
          className="mt-2 inline-block text-xs font-semibold text-[#e8d5a3] underline underline-offset-2"
        >
          View request
        </Link>
      </div>
    );
  }

  if (isSuperAdmin || canManage) {
    return (
      <div className="relative mb-5 rounded-2xl bg-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ring-[rgba(232,213,163,0.16)]">
        <p className="text-sm font-semibold text-[#c9a45c]">
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
      className="relative mb-5 rounded-2xl bg-[rgba(201,164,92,0.14)] px-3.5 py-3.5 text-sm font-semibold text-[#e8d5a3] ring-1 ring-[rgba(201,164,92,0.22)]"
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
}) {
  const pathname = usePathname();
  const canSwitch = isSuperAdmin || isAdmin || canEditBuilder;
  const inAdmin = pathname.startsWith("/account");
  const adminHref = isSuperAdmin || isAdmin ? "/account" : "/account/builder";
  const ownersHome = showPrivateCommunity ? "/feed" : "/";

  const ownerNav: NavItem[] = [];
  if (!isSuperAdmin) {
    ownerNav.push({ href: "/", label: "My flat", match: (p) => p === "/", icon: "flat" });
  }
  ownerNav.push({
    href: "/community",
    label: "Building",
    match: (p) => p.startsWith("/community"),
    icon: "floors",
  });
  if (showPrivateCommunity) {
    ownerNav.splice(1, 0, {
      href: "/feed",
      label: "Updates",
      match: (p) => p.startsWith("/feed"),
      icon: "feed",
    });
    ownerNav.push({
      href: "/members",
      label: "Neighbours",
      match: (p) => p.startsWith("/members"),
      icon: "people",
    });
  }
  ownerNav.push({
    href: "/notifications",
    label: "My messages",
    match: (p) => p.startsWith("/notifications"),
    icon: "bell",
  });

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
    );
  }
  if (isSuperAdmin || isAdmin) {
    adminNav.push({
      href: "/account/requests",
      label: "Requests",
      match: (p) => p.startsWith("/account/requests"),
      icon: "bell",
    });
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

  const homeItem = ownerNav.find((item) => item.href === "/");
  const communityItem = ownerNav.find((item) => item.href === "/community")!;
  const feedItem = ownerNav.find((item) => item.href === "/feed");
  const directoryItem = ownerNav.find((item) => item.href === "/members");
  const alertsItem = ownerNav.find((item) => item.href === "/notifications")!;

  const mobileItems: NavItem[] = inAdmin
    ? [
        {
          href: ownersHome,
          label: "Updates",
          match: (p) => p === ownersHome || p.startsWith("/feed"),
          icon: "feed",
        },
        ...adminNav,
      ]
    : [
        ...(homeItem ? [homeItem] : []),
        ...(feedItem ? [feedItem] : []),
        communityItem,
        ...(directoryItem ? [directoryItem] : []),
        alertsItem,
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
      ];

  function sideLink(item: NavItem) {
    const active = item.match(pathname);
    const badgeCount =
      item.href === "/notifications"
        ? unreadNotifications
        : item.href === "/account"
          ? pendingApprovals
          : 0;
    const showBadge = badgeCount > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
          active
            ? "bg-[rgba(201,164,92,0.16)] text-[#f7f2e6]"
            : "text-[#cbb98a] hover:bg-white/6 hover:text-[#f7f2e6]"
        }`}
      >
        {active ? (
          <span
            className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#c9a45c]"
            aria-hidden
          />
        ) : null}
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            active
              ? "bg-[#c9a45c] text-[#14241c]"
              : "bg-white/6 text-[#d8c898] group-hover:bg-white/10"
          }`}
        >
          <NavIcon name={item.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {showBadge ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-[#c9a45c] px-1.5 py-0.5 text-[10px] font-bold text-[#14241c]">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
      <aside className="relative z-30 hidden h-full w-[min(16.5rem,100%)] shrink-0 flex-col border-r border-[rgba(232,213,163,0.1)] bg-[#102018] px-3 py-4 text-[#f7f2e6] md:flex">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 20% 0%, rgba(201,164,92,0.18), transparent 60%)",
          }}
        />

        <Link href={ownersHome} className="relative mb-4 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#c9a45c] text-xs font-bold tracking-wide text-[#14241c] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            RV
          </span>
          <span className="leading-tight">
            <strong className="block text-[0.95rem] tracking-[0.04em]">
              UDDIIPTA
            </strong>
            <span className="text-[0.68rem] font-medium tracking-[0.14em] text-[#b0a070] uppercase">
              Owners
            </span>
          </span>
        </Link>

        <SidebarAccountCard
          isSuperAdmin={isSuperAdmin}
          canManage={canSwitch}
          accountLabel={accountLabel}
          flatNumber={flatNumber}
          pendingApproval={pendingApproval}
        />

        <nav className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
          <div className="flex flex-col gap-0.5">{ownerNav.map(sideLink)}</div>
          {adminNav.length ? (
            <div className="flex flex-col gap-0.5">
              <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-[#8a7350] uppercase">
                Manage
              </p>
              {adminNav.map(sideLink)}
            </div>
          ) : null}
        </nav>

        <div className="relative mt-2 border-t border-[rgba(232,213,163,0.1)] pt-3">
          <SignOutForm className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#c9a45c] px-4 text-lg font-semibold text-[#14241c] disabled:opacity-60" />
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-20 shrink-0 border-b border-[rgba(27,58,47,0.1)] bg-[#efe8d8]/92 px-3 py-2 backdrop-blur-md md:hidden"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <Link href={ownersHome} className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1b3a2f] text-[10px] font-bold text-[#e8d5a3]">
                RV
              </span>
              <span className="text-sm font-semibold text-[#14241c]">
                {flatNumber || "UDDIIPTA"}
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/notifications"
                className="relative grid size-10 place-items-center rounded-full text-[#1b3a2f] hover:bg-[rgba(27,58,47,0.06)]"
                aria-label={
                  unreadNotifications
                    ? `${unreadNotifications} unread notifications`
                    : "Notifications"
                }
              >
                <NavIcon name="bell" className="size-5" />
                {unreadNotifications > 0 ? (
                  <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-[#c9a45c] px-1 text-[10px] font-bold text-[#14241c]">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <SignOutForm className="inline-flex min-h-12 items-center rounded-full bg-[#1b3a2f] px-4 text-base font-semibold text-[#e8d5a3] disabled:opacity-60" />
            </div>
          </div>
        </header>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {pendingApproval ? <ApprovalWatcher /> : null}
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(27,58,47,0.1)] bg-[#efe8d8]/96 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
          aria-label="Primary"
        >
          <div className="flex gap-1 overflow-x-auto px-2 py-2">
            {mobileItems.map((item) => {
              const active = item.match(pathname);
              const showBadge =
                (item.href === "/notifications" && unreadNotifications > 0) ||
                (item.href === "/account" && pendingApprovals > 0) ||
                (item.href === adminHref && pendingApprovals > 0 && !inAdmin);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold ${
                    active ? "bg-[#1b3a2f] text-[#e8d5a3]" : "text-[#3d5247]"
                  }`}
                >
                  <NavIcon name={item.icon} className="size-4" />
                  <span className="max-w-full truncate">{item.short ?? item.label}</span>
                  {showBadge ? (
                    <span className="absolute top-1.5 right-[22%] size-2 rounded-full bg-[#c9a45c]" />
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
