import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  KeyRound,
  LogIn,
} from "lucide-react";
import { InterellisMark } from "@/components/interellis-mark";

type PublicSiteHeaderProps = {
  className?: string;
  floating?: boolean;
  variant?: "dark" | "light";
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "For companies" },
  { href: "/careers", label: "Open roles" },
  { href: "/candidate-status", label: "Application status" },
];

export function PublicSiteHeader({ className = "", floating = false, variant = "light" }: PublicSiteHeaderProps) {
  const isDark = variant === "dark";
  const linkClass = isDark
    ? "text-slate-300 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-slate-950/20"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 hover:shadow-md hover:shadow-slate-200/80";
  const secondaryButtonClass = isDark
    ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
  const primaryButtonClass = isDark
    ? "bg-white text-slate-950 hover:bg-slate-100"
    : "bg-slate-950 text-white hover:bg-slate-800";
  const headerClass = floating
    ? `pointer-events-none fixed left-1/2 top-3 z-50 w-fit max-w-[calc(100%-1.5rem)] -translate-x-1/2 ${className}`
    : `relative z-20 ${className}`;
  const headerShellClass = floating
    ? isDark
      ? "pointer-events-auto rounded-lg border border-white/10 bg-slate-950/60 shadow-2xl shadow-slate-950/25 backdrop-blur-xl"
      : "pointer-events-auto rounded-lg border border-slate-200/80 bg-white/85 shadow-lg shadow-slate-200/60 backdrop-blur-xl"
    : "";

  return (
    <header className={headerClass}>
      <div className={`mx-auto flex max-w-full items-center justify-between gap-3 px-3 py-2.5 lg:px-4 ${headerShellClass}`}>
        <Link className="flex min-w-0 items-center gap-3" href="/">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDark ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
            <InterellisMark className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className={`truncate text-sm font-semibold ${isDark ? "text-white" : "text-slate-950"}`}>Aptelys</p>
            <p className={`truncate text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}>by Interellis</p>
          </div>
        </Link>

        <nav className="hidden shrink-0 items-center gap-1 text-sm font-semibold lg:flex">
          {navLinks.map((link) => (
            <Link className={`whitespace-nowrap rounded-lg px-3 py-2 transition duration-200 hover:-translate-y-0.5 hover:scale-[1.04] ${linkClass}`} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            className={`hidden h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition hover:scale-[1.03] active:scale-[0.98] sm:inline-flex ${secondaryButtonClass}`}
            href="/careers"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            Open roles
          </Link>
          <Link
            className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition hover:scale-[1.03] active:scale-[0.98] ${primaryButtonClass}`}
            href="/login"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 text-sm text-slate-500 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <InterellisMark className="h-4 w-4 text-slate-700" />
            <span className="font-semibold text-slate-950">Aptelys by Interellis</span>
          </div>
          <p className="mt-2 max-w-xl leading-6">
            AI recruitment CRM for companies, agencies, and independent recruiters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-semibold">
          <Link className="rounded-lg px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-slate-100 hover:text-slate-950" href="/">
            Home
          </Link>
          <Link className="rounded-lg px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-slate-100 hover:text-slate-950" href="/signup">
            Create workspace
          </Link>
          <Link className="rounded-lg px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-slate-100 hover:text-slate-950" href="/careers">
            Open roles
          </Link>
          <Link className="rounded-lg px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-slate-100 hover:text-slate-950" href="/candidate-status">
            Candidate status
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicPageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <PublicSiteHeader />
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-6">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">{eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:px-6">{children}</div>
      <PublicSiteFooter />
    </main>
  );
}

export function PublicAudienceCard({
  description,
  href,
  icon,
  label,
}: {
  description: string;
  href: string;
  icon: "candidate" | "company" | "status";
  label: string;
}) {
  const Icon = icon === "company" ? Building2 : icon === "status" ? KeyRound : BriefcaseBusiness;

  return (
    <Link
      className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
      href={href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" aria-hidden="true" />
      </div>
      <p className="mt-5 text-base font-semibold text-slate-950">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
