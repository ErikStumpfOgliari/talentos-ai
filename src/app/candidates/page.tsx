import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { createCandidate, parseResumeUpload } from "@/app/candidates/actions";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getCandidatesPageData } from "@/lib/candidates-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

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

function getScoreTone(score: number) {
  if (score >= 90) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 75) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (score > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getResumeMessage(status?: string) {
  if (status === "parsed") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      message: "Resume parsed and saved to the candidate CRM.",
    };
  }

  if (status === "needs-review") {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      message: "Resume saved for review. Configure OPENAI_API_KEY to enable full AI parsing for PDFs.",
    };
  }

  if (status === "missing") {
    return {
      tone: "border-rose-200 bg-rose-50 text-rose-800",
      message: "Upload a resume file or paste resume text before parsing.",
    };
  }

  if (status === "too-large") {
    return {
      tone: "border-rose-200 bg-rose-50 text-rose-800",
      message: "Resume is too large. Upload a file under 10 MB.",
    };
  }

  return null;
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ resume?: string }>;
}) {
  const params = await searchParams;
  await requireRole(recruitingRoles);
  const data = await getCandidatesPageData();
  const resumeMessage = getResumeMessage(params?.resume);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="min-w-0">
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950" href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{data.organizationName}</p>
                <h1 className="text-2xl font-semibold text-slate-950">Candidates</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/jobs"
            >
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              Jobs
            </Link>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="#new-candidate"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Candidate
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_390px] lg:px-6">
        <section className="space-y-5">
          {resumeMessage ? (
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${resumeMessage.tone}`}>
              {resumeMessage.message}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Candidates", value: data.stats.total, icon: Users, tone: "text-slate-700" },
              { label: "Applications", value: data.stats.activeApplications, icon: BriefcaseBusiness, tone: "text-sky-700" },
              { label: "Parsed resumes", value: data.stats.parsedResumes, icon: FileText, tone: "text-emerald-700" },
              { label: "Avg score", value: `${data.stats.avgScore}%`, icon: Sparkles, tone: "text-violet-700" },
            ].map((metric) => (
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <metric.icon className={`h-5 w-5 ${metric.tone}`} aria-hidden="true" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Talent database</p>
                <p className="mt-1 text-xs text-slate-500">Profiles, parsed resume state, skills, and active applications.</p>
              </div>
              <label className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  placeholder="Search view placeholder"
                  type="search"
                />
              </label>
            </div>

            <div className="grid gap-3">
              {data.candidates.map((candidate) => (
                <article className="rounded-lg border border-slate-200 p-4" key={candidate.id}>
                  <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="text-base font-semibold text-slate-950 transition hover:text-slate-600" href={`/candidates/${candidate.id}`}>
                          {candidate.name}
                        </Link>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.latestScore)}`}>
                          {candidate.latestScore > 0 ? `${candidate.latestScore}% match` : "Not ranked"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {candidate.source}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">{candidate.currentTitle}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {candidate.email}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {candidate.phone}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {candidate.location}
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{candidate.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {candidate.skills.slice(0, 8).map((skill) => (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length === 0 ? (
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">No skills yet</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid content-start gap-3">
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        href={`/candidates/${candidate.id}`}
                      >
                        Open profile
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["Experience", candidate.yearsExperience],
                          ["Availability", candidate.availability],
                          ["Target", candidate.salaryExpectation],
                          ["Resume", candidate.resumeStatus],
                        ].map(([label, value]) => (
                          <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Education</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{candidate.education}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Applications</p>
                        <div className="mt-2 space-y-2">
                          {candidate.applications.map((application) => (
                            <div className="rounded-md bg-slate-50 px-2 py-2" key={application.id}>
                              <p className="text-sm font-semibold text-slate-950">{application.jobTitle}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {application.stage} - {application.status}
                              </p>
                            </div>
                          ))}
                          {candidate.applications.length === 0 ? (
                            <p className="text-sm text-slate-500">No applications yet.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="resume-parser">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">AI resume parser</p>
            </div>
            <form action={parseResumeUpload} className="grid gap-3">
              <Field label="Resume file">
                <input
                  accept=".pdf,.txt,.md,text/plain,application/pdf"
                  className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  name="resumeFile"
                  type="file"
                />
              </Field>
              <Field label="Fallback resume text">
                <textarea
                  className={textareaClass}
                  name="resumeText"
                  placeholder="Optional for PDFs. Required for TXT-free local fallback when no OpenAI key is configured."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Source">
                  <select className={inputClass} name="source" defaultValue="INBOUND">
                    <option value="INBOUND">Inbound</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="CAREERS_PAGE">Careers page</option>
                    <option value="MANUAL">Manual</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
                <Field label="Apply to job">
                  <select className={inputClass} name="jobId" defaultValue="">
                    <option value="">Only add to database</option>
                    {data.jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Parse resume
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="new-candidate">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Add candidate</p>
            </div>
            <form action={createCandidate} className="grid gap-3">
              <Field label="Name">
                <input className={inputClass} name="name" placeholder="Juliana Pereira" required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email">
                  <input className={inputClass} name="email" placeholder="juliana@example.com" type="email" />
                </Field>
                <Field label="Phone">
                  <input className={inputClass} name="phone" placeholder="+55 11 90000-0000" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title">
                  <input className={inputClass} name="currentTitle" placeholder="AI Product Engineer" />
                </Field>
                <Field label="Location">
                  <input className={inputClass} name="location" placeholder="Sao Paulo, BR" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Source">
                  <select className={inputClass} name="source" defaultValue="MANUAL">
                    <option value="MANUAL">Manual</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="INBOUND">Inbound</option>
                    <option value="INDEED">Indeed</option>
                    <option value="TALENT_POOL">Talent pool</option>
                    <option value="CAREERS_PAGE">Careers page</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
                <Field label="Experience">
                  <input className={inputClass} min="0" name="yearsExperience" placeholder="6" type="number" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Currency">
                  <input className={inputClass} maxLength={3} name="currency" placeholder="USD" />
                </Field>
                <Field label="Salary">
                  <input className={inputClass} min="0" name="salaryExpectation" placeholder="75000" type="number" />
                </Field>
                <Field label="Availability">
                  <input className={inputClass} name="availability" placeholder="2 weeks" />
                </Field>
              </div>
              <Field label="Apply to job">
                <select className={inputClass} name="jobId" defaultValue="">
                  <option value="">Only add to database</option>
                  {data.jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.status})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Summary">
                <textarea
                  className={textareaClass}
                  name="summary"
                  placeholder="Short recruiter-facing profile summary."
                />
              </Field>
              <Field label="Skills">
                <textarea className={textareaClass} name="skills" placeholder={"React\nNode.js\nOpenAI\nPostgreSQL"} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Degree">
                  <input className={inputClass} name="degree" placeholder="B.S." />
                </Field>
                <Field label="Field">
                  <input className={inputClass} name="field" placeholder="Computer Science" />
                </Field>
                <Field label="Institution">
                  <input className={inputClass} name="institution" placeholder="USP" />
                </Field>
              </div>
              <Field label="Resume file name">
                <input className={inputClass} name="resumeFileName" placeholder="juliana-pereira.pdf" />
              </Field>
              <Field label="Resume text">
                <textarea
                  className={textareaClass}
                  name="resumeText"
                  placeholder="Paste extracted resume text here for now. The next module will replace this with real file upload and AI parsing."
                />
              </Field>
              <button
                className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Save candidate
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">CRM readiness</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Structured profile</p>
                <p className="mt-1 text-slate-600">Candidate, skills, education, resume document, and applications persist separately.</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Next unlock</p>
                <p className="mt-1 text-slate-600">Real upload plus OpenAI parsing can write into the same tables.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
