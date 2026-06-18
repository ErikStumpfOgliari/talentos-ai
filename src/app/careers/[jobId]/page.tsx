import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  Send,
  UploadCloud,
} from "lucide-react";
import { submitCareersApplication } from "@/app/careers/[jobId]/actions";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-shell";
import { getPublicJobApplicationData } from "@/lib/careers-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function getErrorMessage(error?: string) {
  if (error === "missing_candidate") {
    return "Name and email are required.";
  }

  if (error === "missing_resume") {
    return "Upload a resume file or paste resume text.";
  }

  if (error === "resume_too_large") {
    return "Resume file must be 10 MB or smaller.";
  }

  if (error === "job_unavailable") {
    return "This job is not accepting applications anymore.";
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
    notFound();
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

          {errorMessage ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
              {errorMessage}
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

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:self-start">
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-950">Apply for this role</p>
          </div>
          <form action={submitCareersApplication} className="grid gap-3">
            <input name="jobId" type="hidden" value={data.job.id} />
            <Field label="Full name">
              <input className={inputClass} name="name" placeholder="Ana Martins" required />
            </Field>
            <Field label="Email">
              <input className={inputClass} name="email" placeholder="ana@example.com" required type="email" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <input className={inputClass} name="phone" placeholder="+55 11 90000-0000" />
              </Field>
              <Field label="Location">
                <input className={inputClass} name="location" placeholder="Sao Paulo, BR" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Current title">
                <input className={inputClass} name="currentTitle" placeholder="Operations Coordinator" />
              </Field>
              <Field label="Experience">
                <input className={inputClass} min={0} name="yearsExperience" placeholder="5" type="number" />
              </Field>
            </div>
            <Field label="Key skills">
              <input className={inputClass} name="skills" placeholder="Customer service, scheduling, Excel" />
            </Field>
            <Field label="Resume file">
              <input
                accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
                className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                name="resumeFile"
                type="file"
              />
            </Field>
            <Field label="Resume text">
              <textarea className={textareaClass} name="resumeText" placeholder="Paste resume text if you do not upload a file." />
            </Field>
            <Field label="Note to hiring team">
              <textarea className={textareaClass} name="coverLetter" placeholder="Share context, availability, or why this role fits." />
            </Field>
            <button
              className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit application
            </button>
          </form>
        </aside>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
