"use client";

import { useCallback, useEffect, useId } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InterellisMark } from "@/components/interellis-mark";
import { useSiteLanguage } from "@/components/site-language-provider";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Gauge,
  Globe2,
  Inbox,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", icon: InterellisMark, i18nKey: "nav.home", label: "Aptelys Home" },
  { href: "/dashboard", icon: BarChart3, i18nKey: "nav.dashboard", label: "Dashboard" },
  { href: "/jobs", icon: BriefcaseBusiness, i18nKey: "nav.jobs", label: "Jobs" },
  { href: "/applications", icon: Inbox, i18nKey: "nav.applications", label: "Applications" },
  { href: "/candidates", icon: Users, i18nKey: "nav.candidates", label: "Candidates" },
  { href: "/matching", icon: Gauge, i18nKey: "nav.aiMatching", label: "AI Matching" },
  { href: "/interviews", icon: CalendarDays, i18nKey: "nav.interviews", label: "Interviews" },
  { href: "/analytics", icon: Activity, i18nKey: "nav.analytics", label: "Analytics" },
  { href: "/email-automation", icon: Mail, i18nKey: "nav.emailAutomation", label: "Email Automation" },
  { href: "/billing", icon: CreditCard, i18nKey: "nav.billing", label: "Billing" },
  { href: "/admin", icon: ShieldCheck, i18nKey: "nav.admin", label: "Admin" },
  { href: "/settings", icon: Settings, i18nKey: "nav.settings", label: "Settings" },
  { href: "/careers", icon: Globe2, i18nKey: "nav.careers", label: "Careers Page" },
];

const prefetchRoutes = navItems.map((item) => item.href);
let appRoutesWarmupStarted = false;

type NavigationCopy = Partial<Record<string, string>>;

function getCopy(copy: NavigationCopy | undefined, key: string, fallback: string) {
  return copy?.[key] ?? fallback;
}

function NavigationBrand({ copy }: { copy?: NavigationCopy }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
        <InterellisMark className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950" data-no-translate>Aptelys</p>
        <p className="truncate text-xs text-slate-500" data-i18n-key="nav.recruitmentCrm">
          {getCopy(copy, "nav.recruitmentCrm", "by Interellis")}
        </p>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationPendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`app-nav-pending-hint ml-auto shrink-0 ${pending ? "app-nav-pending-hint-visible" : ""}`}
    />
  );
}

function AppRoutesPrefetcher() {
  const router = useRouter();

  useEffect(() => {
    if (appRoutesWarmupStarted) {
      return;
    }

    appRoutesWarmupStarted = true;
    let cancelled = false;
    let timeoutId = 0;
    let idleId = 0;

    const warmRoute = (index: number) => {
      if (cancelled || index >= prefetchRoutes.length) {
        return;
      }

      router.prefetch(prefetchRoutes[index]);
      timeoutId = window.setTimeout(() => warmRoute(index + 1), 85);
    };

    const startWarmup = () => warmRoute(0);

    timeoutId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(startWarmup, { timeout: 1200 });
        return;
      }

      startWarmup();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [router]);

  return null;
}

function NavigationLinks({ copy, onNavigate }: { copy?: NavigationCopy; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 text-sm font-medium text-slate-600">
      {navItems.map((item) => {
        const ItemIcon = item.icon;
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className="flex h-10 min-w-0 items-center gap-3 rounded-lg px-3 transition hover:bg-slate-100 hover:text-slate-950 data-[active=true]:bg-slate-950 data-[active=true]:text-white data-[active=true]:hover:bg-slate-950 data-[active=true]:hover:text-white"
            data-app-nav-link
            data-active={isActive ? "true" : undefined}
            data-nav-href={item.href}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            onFocus={() => router.prefetch(item.href)}
            onMouseEnter={() => router.prefetch(item.href)}
            onTouchStart={() => router.prefetch(item.href)}
            prefetch={true}
          >
            <ItemIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate" data-i18n-key={item.i18nKey}>
              {getCopy(copy, item.i18nKey, item.label)}
            </span>
            <NavigationPendingHint />
          </Link>
        );
      })}
    </nav>
  );
}

function NavigationFooter({
  copy,
  onNavigate,
  showWorkspace,
}: {
  copy?: NavigationCopy;
  onNavigate?: () => void;
  showWorkspace?: boolean;
}) {
  return (
    <div className="border-t border-slate-200 p-3">
      {showWorkspace ? (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500" data-i18n-key="nav.organization">
            {getCopy(copy, "nav.organization", "Organization")}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950" data-no-translate>Aptelys</p>
          <p className="mt-1 truncate text-xs text-slate-500" data-i18n-key="nav.workspaceUsers">
            {getCopy(copy, "nav.workspaceUsers", "Pro workspace")}
          </p>
        </div>
      ) : null}
      <form action="/logout" method="post" onSubmit={onNavigate}>
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          type="submit"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span data-i18n-key="nav.signOut">{getCopy(copy, "nav.signOut", "Sign out")}</span>
        </button>
      </form>
    </div>
  );
}

export function AppNavigationPanelContent({
  className = "",
  copy,
  onNavigate,
  showWorkspace = true,
}: {
  className?: string;
  copy?: NavigationCopy;
  onNavigate?: () => void;
  showWorkspace?: boolean;
}) {
  const { copy: languageCopy } = useSiteLanguage();
  const resolvedCopy = copy ?? languageCopy;

  return (
    <div className={`flex h-full min-h-0 flex-col bg-white ${className}`}>
      <NavigationBrand copy={resolvedCopy} />
      <AppRoutesPrefetcher />
      <NavigationLinks copy={resolvedCopy} onNavigate={onNavigate} />
      <NavigationFooter copy={resolvedCopy} onNavigate={onNavigate} showWorkspace={showWorkspace} />
    </div>
  );
}

export function AppNavigationSidebar({ className = "", copy }: { className?: string; copy?: NavigationCopy }) {
  const { copy: languageCopy } = useSiteLanguage();
  const resolvedCopy = copy ?? languageCopy;

  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${className}`}
    >
      <AppNavigationPanelContent copy={resolvedCopy} />
    </aside>
  );
}

export function AppNavigationMenu({ className = "", copy }: { className?: string; copy?: NavigationCopy }) {
  const menuId = useId();
  const drawerId = `${menuId}-drawer`;
  const { copy: languageCopy } = useSiteLanguage();
  const resolvedCopy = copy ?? languageCopy;

  const closeMenu = useCallback(() => {
    const menuControl = document.getElementById(menuId);
    if (menuControl instanceof HTMLInputElement) {
      menuControl.checked = false;
    }
  }, [menuId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu]);

  return (
    <div className={`relative inline-flex ${className}`}>
      <input
        aria-controls={drawerId}
        aria-label="Open navigation"
        className="peer sr-only"
        data-testid="app-navigation-trigger"
        id={menuId}
        type="checkbox"
      />
      <label
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2"
        htmlFor={menuId}
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open navigation</span>
      </label>

      <div
        className="pointer-events-none fixed inset-0 z-50 peer-checked:pointer-events-auto"
        data-app-mobile-nav-overlay
      >
        <label
          aria-label="Close navigation"
          className="absolute inset-0 block cursor-pointer bg-slate-950/40 opacity-0 transition-opacity duration-200"
          data-app-mobile-nav-backdrop
          htmlFor={menuId}
        />
        <aside
          aria-label="Site navigation"
          aria-modal="true"
          className="relative flex h-dvh w-[min(20rem,calc(100dvw-0.75rem))] max-w-full -translate-x-full flex-col overflow-hidden border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out will-change-transform"
          data-app-mobile-nav-drawer
          id={drawerId}
          role="dialog"
        >
          <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <InterellisMark className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950" data-no-translate>Aptelys</p>
                <p className="truncate text-xs text-slate-500" data-i18n-key="nav.recruitmentCrm">
                  {getCopy(resolvedCopy, "nav.recruitmentCrm", "by Interellis")}
                </p>
              </div>
            </div>
            <label
              aria-label="Close navigation"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              htmlFor={menuId}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  closeMenu();
                }
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </label>
          </div>

          <NavigationLinks copy={resolvedCopy} onNavigate={closeMenu} />
          <NavigationFooter copy={resolvedCopy} onNavigate={closeMenu} />
        </aside>
      </div>
    </div>
  );
}
