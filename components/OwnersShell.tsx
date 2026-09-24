"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type NavItem = {
  href: string
  label: string
  match: (p: string) => boolean
  icon: "home" | "feed" | "floors" | "model" | "flat" | "admin" | "bell" | "people"
};

function SidebarAccountCard({
  isSuperAdmin,
  accountLabel,
  flatNumber,
  pendingApproval,
  active = false,
}: {
  readonly isSuperAdmin: boolean
  readonly accountLabel: string | null
  readonly flatNumber: string | null
  readonly pendingApproval: boolean
  readonly active?: boolean
}) {
  if (isSuperAdmin) {
    return (
      <Link
        href="/account"
        className={`relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[rgba(201,164,92,0.22)] to-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ${
          active
            ? "ring-[#c9a45c]"
            : "ring-[rgba(232,213,163,0.16)]"
        }`}
      >
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
          Super admin
        </p>
        <p className="mt-1 truncate text-sm font-semibold">
          {accountLabel || "Account"}
        </p>
        <span className="mt-2 inline-block text-xs font-semibold text-[#e8d5a3]">
          Admin home
        </span>
      </Link>
    );
  }

  if (flatNumber) {
    return (
      <Link
        href="/update"
        className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[rgba(201,164,92,0.22)] to-[rgba(255,255,255,0.04)] px-3.5 py-3.5 ring-1 ring-[rgba(232,213,163,0.16)] transition-transform hover:scale-[1.01]"
      >
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#c9a45c] uppercase">
          Your flat
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight">{flatNumber}</p>
          <span className="pb-0.5 text-xs font-semibold text-[#cbb98a]">
            Manage →
          </span>
        </div>
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

  return (
    <Link
      href="/register"
      className="relative mb-5 rounded-2xl bg-[rgba(201,164,92,0.14)] px-3.5 py-3.5 text-sm font-semibold text-[#e8d5a3] ring-1 ring-[rgba(201,164,92,0.22)]"
    >
      Link your flat →
    </Link>
  );
}

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

export function OwnersShell({
  children,
  isAdmin = false,
  isSuperAdmin = false,
  canEditBuilder = false,
  showMyFlat = false,
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
  showMyFlat?: boolean
  flatNumber?: string | null
  pendingApproval?: boolean
  unreadNotifications?: number
  pendingApprovals?: number
  accountLabel?: string | null
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  const explore: NavItem[] = [
    { href: "/", label: "Dashboard", match: (p) => p === "/", icon: "home" },
    {
      href: "/feed",
      label: "Feed",
      match: (p) => p.startsWith("/feed"),
      icon: "feed",
    },
    {
      href: "/community",
      label: "Community",
      match: (p) => p.startsWith("/community"),
      icon: "floors",
    },
    {
      href: "/members",
      label: "Members",
      match: (p) => p.startsWith("/members"),
      icon: "people",
    },
    {
      href: "/designer",
      label: "Designer",
      match: (p) => p.startsWith("/designer"),
      icon: "model",
    },
  ];

  const account: NavItem[] = [];
  if (isSuperAdmin || isAdmin) {
    account.push(
      {
        href: "/account",
        label: "Admin",
        match: (p) => p === "/account",
        icon: "admin",
      },
      {
        href: "/account/owners",
        label: "Owners",
        match: (p) => p.startsWith("/account/owners"),
        icon: "flat",
      },
    );
  }
  if (isSuperAdmin || isAdmin || canEditBuilder) {
    account.push(
      {
        href: "/account/builder",
        label: "Builder",
        match: (p) => p.startsWith("/account/builder"),
        icon: "model",
      },
    );
  }
  if (isSuperAdmin || isAdmin) {
    account.push({
      href: "/account/roles",
      label: "People",
      match: (p) => p.startsWith("/account/roles"),
      icon: "people",
    });
  }

  const personal: NavItem[] = [
    {
      href: "/notifications",
      label: "Notifications",
      match: (p) => p.startsWith("/notifications"),
      icon: "bell",
    },
  ];

  if (showMyFlat) {
    personal.push({
      href: "/update",
      label: "My flat",
      match: (p) => p.startsWith("/update"),
      icon: "flat",
    });
  }

  const manageMobile = isSuperAdmin || isAdmin;
  const mobileItems = manageMobile
    ? [
        {
          href: "/account",
          label: "Admin",
          match: (p: string) => p === "/account",
          icon: "admin" as const,
        },
        {
          href: "/account/owners",
          label: "Owners",
          match: (p: string) => p.startsWith("/account/owners"),
          icon: "flat" as const,
        },
        {
          href: "/account/roles",
          label: "People",
          match: (p: string) => p.startsWith("/account/roles"),
          icon: "people" as const,
        },
        explore[0]!,
      ]
    : [
        explore[0]!,
        explore[2]!,
        explore[3]!,
        ...(showMyFlat
          ? [
              {
                href: "/update",
                label: "My flat",
                match: (p: string) => p.startsWith("/update"),
                icon: "flat" as const,
              },
            ]
          : [
              {
                href: "/notifications",
                label: "Alerts",
                match: (p: string) => p.startsWith("/notifications"),
                icon: "bell" as const,
              },
            ]),
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

  function section(title: string, items: NavItem[]) {
    if (!items.length) return null;
    return (
      <div className="mb-5">
        <p className="mb-1.5 px-3 text-[0.65rem] font-semibold tracking-[0.16em] text-[#9a8a60] uppercase">
          {title}
        </p>
        <div className="flex flex-col gap-0.5">{items.map(sideLink)}</div>
      </div>
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

        <Link href="/" className="relative mb-5 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#c9a45c] text-xs font-bold tracking-wide text-[#14241c] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            RV
          </span>
          <span className="leading-tight">
            <strong className="block text-[0.95rem] tracking-[0.04em]">
              UDDIIPTA
            </strong>
            <span className="text-[0.68rem] font-medium tracking-[0.14em] text-[#b0a070] uppercase">
              Owners portal
            </span>
          </span>
        </Link>

        <SidebarAccountCard
          isSuperAdmin={isSuperAdmin}
          accountLabel={accountLabel}
          flatNumber={flatNumber}
          pendingApproval={pendingApproval}
          active={pathname.startsWith("/account")}
        />

        <nav className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5">
          {section(isSuperAdmin || isAdmin ? "Admin" : "Manage", account)}
          {section("Explore", explore)}
          {section("You", personal)}
        </nav>

        <div className="relative mt-2 border-t border-[rgba(232,213,163,0.1)] pt-3">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#b0a070] transition-colors hover:bg-white/6 hover:text-[#f7f2e6]"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-white/5">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path d="M10 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-2" />
                <path d="M14 12H4m0 0 3-3m-3 3 3 3" />
              </svg>
            </span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] bg-[#efe8d8]/92 px-3 py-2 backdrop-blur-md md:hidden"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1b3a2f] text-[10px] font-bold text-[#e8d5a3]">
              RV
            </span>
            <span className="text-sm font-semibold text-[#14241c]">
              {flatNumber ? flatNumber : "UDDIIPTA"}
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
            <button
              type="button"
              onClick={logout}
              className="min-h-10 rounded-full px-3 text-sm font-semibold text-[#3d5247]"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgba(27,58,47,0.1)] bg-[#efe8d8]/96 px-1.5 pt-1.5 backdrop-blur-md md:hidden"
          style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
          aria-label="Primary"
        >
          <div className="flex gap-0.5">
            {mobileItems.map((item) => {
              const active = item.match(pathname);
              const showBadge =
                (item.href === "/notifications" && unreadNotifications > 0) ||
                (item.href === "/account" && pendingApprovals > 0);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold ${
                    active
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : "text-[#3d5247]"
                  }`}
                >
                  <NavIcon name={item.icon} className="size-4" />
                  <span className="truncate">{item.label}</span>
                  {showBadge ? (
                    <span className="absolute top-1.5 right-[28%] size-1.5 rounded-full bg-[#c9a45c]" />
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
