import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  SearchCheck,
  Users,
} from "lucide-react";
import { PublicPageShell } from "@/components/public-site-shell";
import { getPublicCareersData } from "@/lib/careers-data";

export const dynamic = "force-dynamic";

export default async function CareersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const data = await getPublicCareersData();

  return (
    <PublicPageShell
      actions={
        <Link
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] sm:w-auto"
          href="/candidate-status"
        >
          <SearchCheck className="h-4 w-4" aria-hidden="true" />
          Track application
        </Link>
      }
      description="Browse public opportunities published by the hiring workspace. This page is separate from the internal Aptelys recruiter dashboard."
      eyebrow="Aptelys careers"
      title="Open roles for candidates."
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: BriefcaseBusiness, label: "Active jobs", value: data.jobs.length },
          { icon: Users, label: "Hiring teams", value: "AI-ready" },
          { icon: CheckCircle2, label: "Applications", value: "Public intake" },
        ].map((item) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item.label}>
            <item.icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </section>

      <section>
        {params?.error ? (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            This job is not available anymore.
          </div>
        ) : null}

        <div className="grid gap-4">
          {data.jobs.map((job) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md sm:p-5" key={job.id}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-semibold text-slate-950 sm:text-xl">{job.title}</h2>
                    <span className="dashboard-pill rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Open
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                      {job.department}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {job.location}
                    </span>
                    <span>{job.workMode}</span>
                    <span>{job.employmentType}</span>
                    <span>{job.salaryRange}</span>
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{job.description}</p>
                </div>

                <div className="grid content-start gap-3">
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
                    href={`/careers/${job.id}`}
                  >
                    Apply now
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500">Openings</p>
                    <p className="mt-1 font-semibold text-slate-950">{job.openings}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.applicationCount} candidates in process</p>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {data.jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-10">
              <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-950">No open roles</p>
              <p className="mt-1 text-sm text-slate-500">Please check back later for new opportunities.</p>
            </div>
          ) : null}
        </div>
      </section>
    </PublicPageShell>
  );
}
