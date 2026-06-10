import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileSearch,
  Gauge,
  LockKeyhole,
  MailCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const timeline = [
  {
    title: "Create workspace",
    detail: "A company, agency, or independent recruiter creates a workspace and becomes the owner.",
  },
  {
    title: "Publish jobs",
    detail: "Recruiters create roles, share careers pages, and receive applications in the ATS.",
  },
  {
    title: "Review with AI",
    detail: "TalentOS parses resumes, extracts candidate signals, and ranks matches against each role.",
  },
  {
    title: "Move the pipeline",
    detail: "Teams schedule interviews, automate emails, and track hiring performance from one place.",
  },
];

const recruiterFeatures = [
  { icon: BriefcaseBusiness, label: "Job CRM", detail: "Create roles and manage requisitions." },
  { icon: FileSearch, label: "Resume parsing", detail: "Extract profile data from uploaded resumes." },
  { icon: Gauge, label: "AI matching", detail: "Rank candidates against job requirements." },
  { icon: CalendarDays, label: "Scheduling", detail: "Create interviews and self-scheduling links." },
  { icon: MailCheck, label: "Automation", detail: "Send templates when stages change." },
  { icon: BadgeCheck, label: "Analytics", detail: "Track funnel, scores, and pipeline time." },
];

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <main className="bg-slate-100 text-slate-950">
      <section className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          <div className="grid h-full min-w-[920px] grid-cols-6 gap-3 p-5 opacity-70 md:p-8">
            {["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"].map((stage, index) => (
              <div className="flex min-h-full flex-col rounded-lg border border-white/10 bg-white/[0.06] p-3" key={stage}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-300">{stage}</p>
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-lg border border-white/10 bg-white/[0.12] p-3">
                    <div className="h-3 w-2/3 rounded-full bg-white/30" />
                    <div className="mt-3 h-2 w-full rounded-full bg-white/15" />
                    <div className="mt-2 h-2 w-4/5 rounded-full bg-white/15" />
                  </div>
                  {index % 2 === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.08] p-3">
                      <div className="h-3 w-1/2 rounded-full bg-white/25" />
                      <div className="mt-3 h-2 w-3/4 rounded-full bg-white/15" />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 lg:px-6">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">TalentOS AI</p>
              <p className="truncate text-xs text-slate-300">AI Recruitment CRM</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98] sm:inline-flex"
              href="/careers"
            >
              Open roles
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-slate-100 active:scale-[0.98]"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-4 pb-16 pt-10 lg:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-emerald-300">ATS SaaS for AI recruiting operations</p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
              Hire with a workspace built for recruiters, candidates, and AI review.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              TalentOS helps companies create hiring workspaces, publish jobs, parse resumes, rank candidates, schedule interviews,
              automate communication, and track recruiting performance.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-slate-100 active:scale-[0.98]"
                href="/signup"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Create company workspace
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98]"
                href="/careers"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                See available jobs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-2 lg:px-6">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">For companies and recruiters</p>
                <p className="text-xs text-slate-500">Create account, create workspace, manage jobs.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white" href="/signup">
                Start workspace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" href="/login">
                Sign in
              </Link>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">For candidates</p>
                <p className="text-xs text-slate-500">View jobs or access application status.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white" href="/careers">
                View jobs
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700" href="/candidate-status">
                Access my application
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase text-slate-500">Product flow</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">A complete hiring operating system.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {timeline.map((item, index) => (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                {index + 1}
              </span>
              <p className="mt-5 text-base font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">Recruiter workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Everything the paying customer needs.</h2>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Owner and recruiter permissions
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recruiterFeatures.map((feature) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={feature.label}>
                <feature.icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-950">{feature.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <span className="font-semibold text-slate-950">TalentOS AI</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="hover:text-slate-950" href="/signup">
              Companies
            </Link>
            <Link className="hover:text-slate-950" href="/careers">
              Candidates
            </Link>
            <Link className="hover:text-slate-950" href="/login">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
