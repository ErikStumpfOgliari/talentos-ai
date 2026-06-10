import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  BriefcaseBusiness,
  Layers3,
  Gauge,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { rankCandidatesForJob } from "@/app/matching/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { canUseOpenAIProvider } from "@/lib/ai-provider";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getMatchingPageData } from "@/lib/matching-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function getScoreTone(score: number) {
  if (score >= 85) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 65) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (score > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export default async function MatchingPage({
  searchParams,
}: {
  searchParams?: Promise<{ jobId?: string; ranked?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(recruitingRoles);
  const data = await getMatchingPageData(params?.jobId, session.organization.id);
  const selectedJobId = data.selectedJob?.id ?? "";

  return (
    <WorkspacePageShell
      actions={
        <>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href="/jobs"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            Jobs
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href="/candidates"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Candidates
          </Link>
        </>
      }
      icon={<Gauge className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      title="AI Matching"
    >
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          {params?.ranked ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Candidate ranking saved to the ATS pipeline.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { label: "Candidates", value: data.stats.candidates, icon: Users, tone: "text-slate-700" },
              { label: "Ranked", value: data.stats.ranked, icon: CheckCircle2, tone: "text-emerald-700" },
              { label: "Avg score", value: `${data.stats.avgScore}%`, icon: BarChart3, tone: "text-sky-700" },
              { label: "Top score", value: `${data.stats.topScore}%`, icon: Sparkles, tone: "text-violet-700" },
            ].map((metric) => (
              <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-500">{metric.label}</p>
                  <metric.icon className={`h-5 w-5 ${metric.tone}`} aria-hidden="true" />
                </div>
                <p className="mt-3 break-words text-2xl font-semibold text-slate-950">{metric.value}</p>
              </article>
            ))}
          </div>

          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">Ranked shortlist</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {data.selectedJob ? `${data.selectedJob.title} - ${data.selectedJob.location}` : "No open role selected"}
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <form action="/matching" className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select className={inputClass} defaultValue={selectedJobId} name="jobId">
                    {data.jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    type="submit"
                  >
                    View
                  </button>
                </form>
                <form action={rankCandidatesForJob} className="min-w-0">
                  <input name="jobId" type="hidden" value={selectedJobId} />
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={!selectedJobId}
                    type="submit"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Rank candidates
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-3">
              {data.candidates.map((candidate, index) => (
                <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4" key={candidate.id}>
                  <div className="grid gap-4 2xl:grid-cols-[72px_minmax(0,1fr)_260px]">
                    <div className="flex xl:block">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-base font-semibold text-slate-950">{candidate.name}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.score)}`}>
                          {candidate.score}% match
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {candidate.isSaved ? "Saved" : "Preview"}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm font-medium text-slate-600">{candidate.currentTitle}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="break-words">{candidate.location}</span>
                        <span>{candidate.yearsExperience}</span>
                        <span>{candidate.source}</span>
                        <span>{candidate.stage}</span>
                      </div>
                      <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-600">{candidate.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {candidate.skills.slice(0, 8).map((skill) => (
                          <span className="dashboard-chip rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid content-start gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Score</p>
                          <p className="text-sm font-semibold text-slate-950">{candidate.score}%</p>
                        </div>
                        <div className="mt-3">
                          <ProgressBar value={candidate.score} />
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-500">{candidate.mode}</p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase text-emerald-700">Strengths</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                          {candidate.strengths.slice(0, 3).map((strength) => (
                            <li className="break-words" key={strength}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                        <p className="text-xs font-semibold uppercase text-amber-700">Review</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                          {candidate.gaps.slice(0, 3).map((gap) => (
                            <li className="break-words" key={gap}>{gap}</li>
                          ))}
                          {candidate.gaps.length === 0 ? <li>No major gaps detected.</li> : null}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {data.candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No candidates yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add candidates or parse resumes before ranking a role.</p>
                </div>
              ) : null}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Selected role</p>
            </div>
            {data.selectedJob ? (
              <div className="grid gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Title</p>
                  <p className="mt-1 font-semibold text-slate-950">{data.selectedJob.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                    <p className="mt-1 font-semibold text-slate-950">{data.selectedJob.status}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Avg</p>
                    <p className="mt-1 font-semibold text-slate-950">{data.selectedJob.avgScore}%</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Department</p>
                  <p className="mt-1 font-semibold text-slate-950">{data.selectedJob.department}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active jobs available.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Role queue</p>
            </div>
            <div className="space-y-2">
              {data.jobs.map((job) => (
                <Link
                  className={`block rounded-lg border p-3 transition ${
                    job.id === selectedJobId
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  href={`/matching?jobId=${job.id}`}
                  key={job.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{job.title}</p>
                      <p className={`mt-1 text-xs ${job.id === selectedJobId ? "text-slate-300" : "text-slate-500"}`}>
                        {job.department} - {job.status}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        job.id === selectedJobId ? "bg-white text-slate-950" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {job.avgScore}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Matching engine</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Mode</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {canUseOpenAIProvider() ? "OpenAI embeddings" : "Smart local matching"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Persistence</p>
                <p className="mt-1 text-slate-600">Scores write to Application.matchScore and feed the ATS pipeline.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
