import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileSearch,
  Gauge,
  MailCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  PublicAudienceCard,
  PublicSiteFooter,
  PublicSiteHeader,
} from "@/components/public-site-shell";

const timeline = [
  {
    title: "Create the workspace",
    detail: "A company, agency, or independent recruiter starts a secure hiring workspace.",
  },
  {
    title: "Publish roles",
    detail: "Open jobs become public application pages while the ATS stays private.",
  },
  {
    title: "Review with AI",
    detail: "Resumes are parsed, matched, and ranked against each role.",
  },
  {
    title: "Operate the pipeline",
    detail: "Recruiters schedule interviews, automate emails, and monitor hiring performance.",
  },
];

const features = [
  { icon: BriefcaseBusiness, label: "Job CRM", detail: "Create roles, manage requisitions, and organize hiring ownership." },
  { icon: FileSearch, label: "Resume intelligence", detail: "Upload resumes, extract structured profiles, and keep every document attached." },
  { icon: Gauge, label: "AI matching", detail: "Compare candidates against role requirements with ranking and match context." },
  { icon: CalendarDays, label: "Scheduling", detail: "Coordinate interviews, self-scheduling links, and calendar sync." },
  { icon: MailCheck, label: "Automation", detail: "Send candidate updates from templates when key hiring events happen." },
  { icon: BadgeCheck, label: "Analytics", detail: "Track funnel health, score quality, time in stage, and hiring outcomes." },
];

const boardStages = ["Applied", "Screening", "Interview", "Offer"];

const previewCandidates = [
  { name: "Rafael Lima", title: "Sales Account Executive", skills: ["CRM", "Negotiation"] },
  { name: "Maya Costa", title: "Finance Analyst", skills: ["Budgeting", "Reporting"] },
  { name: "Ana Martins", title: "Clinic Coordinator", skills: ["Scheduling", "Care"] },
  { name: "Bianca Rocha", title: "Operations Manager", skills: ["Logistics", "Leadership"] },
];

export const dynamic = "force-dynamic";

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[38rem] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-1 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-emerald-300">Live ATS workspace</p>
          <p className="truncate text-sm font-semibold text-white">Operations Coordinator</p>
        </div>
        <div className="hidden items-center gap-2 text-xs font-semibold text-slate-300 sm:flex">
          <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">AI ranked</span>
          <span className="rounded-full bg-sky-400/15 px-2 py-1 text-sky-200">Calendar ready</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {boardStages.map((stage, index) => (
          <div className="min-h-[14rem] rounded-lg border border-white/10 bg-slate-950/35 p-2.5" key={stage}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">{stage}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.68rem] text-slate-300">{index + 1}</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.08] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white sm:text-sm">
                      {previewCandidates[index]?.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-300">
                      {previewCandidates[index]?.title}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-300 px-2 py-1 text-xs font-semibold text-slate-950">
                    {[78, 91, 96, 92][index]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(previewCandidates[index]?.skills ?? []).map((skill) => (
                    <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              {index === 1 ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2.5">
                  <div className="h-2.5 w-2/3 rounded-full bg-white/25" />
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10" />
                  <div className="mt-2 h-2 w-4/5 rounded-full bg-white/10" />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-slate-100 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white lg:min-h-[100svh]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,0.16),transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_58%,#111827_100%)]" />
        <PublicSiteHeader floating variant="dark" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-28 md:pb-10 lg:min-h-[100svh] lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.9fr)] lg:items-center lg:px-6 lg:pb-6 lg:pt-24">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200 sm:text-sm">
              Aptelys
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-normal sm:text-5xl lg:text-[2.75rem] xl:text-[3rem]">
              Meet Aptelys
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Aptelys is an intelligent recruiting platform developed by Interellis to connect companies with the right talent more precisely.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] hover:bg-slate-100 active:scale-[0.98]"
                href="/signup"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Create workspace
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98]"
                href="/careers"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                View open roles
              </Link>
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-3 lg:px-6">
          <PublicAudienceCard
            description="Create an account, launch a workspace, invite recruiters, and manage your hiring operation."
            href="/signup"
            icon="company"
            label="For companies and recruiters"
          />
          <PublicAudienceCard
            description="Explore public roles and submit your resume without entering the internal recruiter workspace."
            href="/careers"
            icon="candidate"
            label="For candidates"
          />
          <PublicAudienceCard
            description="Use your secure application link or token to follow the process timeline."
            href="/candidate-status"
            icon="status"
            label="Application status"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 lg:px-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(260px,0.35fr)] md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">How Aptelys works</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              From public application to private recruiter workflow.
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Candidates stay in a clean public experience. Recruiters operate the full ATS behind authenticated workspaces.
          </p>
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

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-slate-500">Recruiter workspace</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">
                Built for the paying customer.
              </h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Owner and recruiter permissions
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={feature.label}>
                <feature.icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-950">{feature.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase text-slate-500">Ready to operate</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            Start with a workspace or review public opportunities.
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]" href="/signup">
            Create workspace
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]" href="/candidate-status">
            Track application
          </Link>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
