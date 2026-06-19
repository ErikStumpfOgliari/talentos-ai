import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
} from "lucide-react";
import { PublicJobApplicationForm } from "@/components/public-job-application-form";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-shell";
import { getPublicJobApplicationData } from "@/lib/careers-data";
import { RESUME_FILE_TOO_LARGE_MESSAGE } from "@/lib/resume-upload-limits";

export const dynamic = "force-dynamic";

function getErrorMessage(error?: string) {
  if (error === "missing_candidate") {
    return "Name and email are required.";
  }

  if (error === "missing_resume") {
    return "Upload a resume file or paste resume text.";
  }

  if (error === "resume_too_large") {
    return RESUME_FILE_TOO_LARGE_MESSAGE;
  }

  if (error === "job_unavailable") {
    return "This job is not accepting applications anymore.";
  }

  if (error === "submit_failed") {
    return "We could not submit this application. Try again or paste your resume text.";
  }

  if (error === "rate_limited") {
    return "Too many application attempts from this device. Wait a few minutes and try again.";
  }

  return null;
}

export default async function PublicJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<{ applied?: string; error?: string }>;
}) {
  const { jobId } = await params;
  const query = await searchParams;
  const data = await getPublicJobApplicationData(jobId);

  if (!data) {
    return (
      <main className="public-shell min-h-screen overflow-x-hidden bg-slate-100 text-slate-950" data-public-theme-scope>
        <PublicSiteHeader showThemeToggle />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-10 lg:px-6">
          <div className="w-full rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-950">This role is not accepting applications.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The job may still be a draft, paused, closed, or no longer published by the hiring workspace.
            </p>
            <Link
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/careers"
            >
              View open roles
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </section>
        <PublicSiteFooter />
      </main>
    );
  }

  const errorMessage = getErrorMessage(query?.error);

  return (
    <main className="public-shell min-h-screen overflow-x-hidden bg-slate-100 text-slate-950" data-public-theme-scope>
      <PublicSiteHeader showThemeToggle />
      <header className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:py-6 lg:px-6">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950" href="/careers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Open roles
          </Link>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase text-slate-500">{data.organizationName}</p>
                  <h1 className="break-words text-2xl font-semibold text-slate-950 sm:text-3xl">{data.job.title}</h1>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  {data.job.department}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {data.job.location}
                </span>
                <span>{data.job.workMode}</span>
                <span>{data.job.employmentType}</span>
                <span>{data.job.salaryRange}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Openings</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{data.job.openings}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Pipeline</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{data.job.applicationCount}</p>
              </div>
              <Link
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
                href="#apply"
              >
                Apply now
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:py-6 lg:grid-cols-[1fr_420px] lg:px-6">
        <section className="space-y-5">
          {query?.applied ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Application received.</p>
                  <p className="mt-1 leading-6">
                    Your profile was added to the hiring pipeline. The recruiting team can now review your resume.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Role brief</p>
            </div>
            <p className="text-sm leading-6 text-slate-600">{data.job.description}</p>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-slate-950">Requirements</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {(data.job.requirements.length ? data.job.requirements : ["No requirements listed"]).map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-slate-950">Responsibilities</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {(data.job.responsibilities.length ? data.job.responsibilities : ["No responsibilities listed"]).map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:self-start" id="apply">
          <div className="mb-4 flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">Apply for this role</p>
          </div>
          <PublicJobApplicationForm errorMessage={errorMessage} jobId={data.job.id} />
        </aside>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
