import Link from "next/link";
import {
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Gauge,
  Layers3,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { applyToJobFromMatching, rankCandidatesForJob } from "@/app/matching/actions";
import { AiAnalyzeButton } from "@/components/ai-analyze-button";
import { WorkspacePanelTabs } from "@/components/workspace-panel-tabs";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getMatchingPageData, type MatchingPageCandidate } from "@/lib/matching-data";

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

function SignalRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const barColor = pct >= 65 ? "bg-emerald-500" : pct >= 35 ? "bg-sky-500" : "bg-amber-400";

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-950">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function buildAiVerdict(candidate: MatchingPageCandidate, jobTitle: string): string {
  const parts: string[] = [];

  if (candidate.score >= 80) {
    parts.push(`Strong match (${candidate.score}%) for the ${jobTitle} role — profile closely aligns with the core requirements.`);
  } else if (candidate.score >= 55) {
    parts.push(`Partial match (${candidate.score}%) detected for ${jobTitle} — candidate meets some criteria but gaps remain.`);
  } else {
    parts.push(`Limited alignment (${candidate.score}%) with the ${jobTitle} role — the candidate does not cover the primary requirements.`);
  }

  if (candidate.missingSkills.length > 0) {
    parts.push(`Requirements not detected in profile: ${candidate.missingSkills.slice(0, 3).join(", ")}.`);
  }

  if (candidate.signals.experienceFit < 0.65 && candidate.signals.desiredYears > 0) {
    parts.push(`Experience level likely falls below the ${candidate.signals.desiredYears}+ year threshold expected for this seniority.`);
  }

  if (candidate.signals.semanticSimilarity < 0.2) {
    parts.push("Candidate background has minimal semantic overlap with the job description language.");
  }

  if (candidate.signals.profileCompleteness < 0.5) {
    parts.push("Profile is incomplete — enriching resume data would improve scoring precision.");
  }

  if (candidate.matchedSkills.length > 0) {
    parts.push(`Confirmed signals: ${candidate.matchedSkills.slice(0, 3).join(", ")}.`);
  }

  return parts.join(" ");
}

type MatchingPageData = Awaited<ReturnType<typeof getMatchingPageData>>;

function MatchingToolsPanel({
  data,
  selectedJobId,
}: {
  data: MatchingPageData;
  selectedJobId: string;
}) {
  return (
    <WorkspacePanelTabs
      tabs={[
        {
          id: "rank",
          label: "Rank",
          description: "Choose an open role and run candidate ranking without crowding the shortlist.",
          children: (
            <div className="grid gap-4">
              <form action="/matching" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Select role</p>
                </div>
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
                  View shortlist
                </button>
              </form>

              <form action={rankCandidatesForJob} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <input name="jobId" type="hidden" value={selectedJobId} />
                <div>
                  <p className="text-sm font-semibold text-slate-950">Rank candidates</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Updates match scores and feeds the ATS pipeline for the selected role.
                  </p>
                </div>
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
          ),
        },
        {
          id: "roles",
          label: "Roles",
          description: "Switch between open roles and keep the main ranking area focused.",
          children: (
            <div className="space-y-3">
              {data.selectedJob ? (
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <p className="text-sm font-semibold text-slate-950">Selected role</p>
                  </div>
                  <div className="grid gap-2 text-sm">
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
                </section>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No active jobs available.</p>
              )}

              <section className="rounded-lg border border-slate-200 bg-white p-4">
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
            </div>
          ),
        },
      ]}
    />
  );
}

export default async function MatchingPage({
  searchParams,
}: {
  searchParams?: Promise<{ jobId?: string; ranked?: string; applied?: string }>;
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
      rightPanel={<MatchingToolsPanel data={data} selectedJobId={selectedJobId} />}
      rightPanelButtonIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
      rightPanelButtonLabel="Tools"
      rightPanelDescription="Role selection and candidate ranking."
      rightPanelTitle="Matching tools"
      title="AI Matching"
    >
      <div className="grid min-w-0 gap-5">
        <section className="space-y-5">
          {params?.ranked ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Candidate ranking saved to the ATS pipeline.
            </div>
          ) : params?.applied ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Candidate added to this role and scored. AI analysis is now available on the candidate card.
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

          <div className="rounded-lg bg-slate-950 p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <BrainCircuit className="h-4 w-4 text-violet-300" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">AI Matching Engine</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Scores are computed across 5 weighted signals: skill coverage (45%), semantic similarity via embeddings (25%),
                  experience fit (15%), title alignment (10%), and profile completeness (5%).
                  When OpenAI embeddings are configured, vector cosine similarity replaces token-overlap for higher precision matching.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Embedding model</p>
                <p className="mt-1 font-semibold text-white">text-embedding-3-small</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Signals</p>
                <p className="mt-1 font-semibold text-white">5 weighted dimensions</p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Output</p>
                <p className="mt-1 font-semibold text-white">Score-sorted shortlist</p>
              </div>
            </div>
          </div>

          <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5 min-w-0">
              <p className="text-sm font-semibold text-slate-950">Ranked shortlist</p>
              <p className="mt-1 truncate text-xs text-slate-500">
                {data.selectedJob ? `${data.selectedJob.title} · ${data.selectedJob.location}` : "No open role selected"}
              </p>
            </div>

            <div className="grid gap-5">
              {data.candidates.map((candidate, index) => (
                <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4" key={candidate.id}>
                  <div className="grid gap-4 2xl:grid-cols-[72px_minmax(0,1fr)_260px]">

                    <div className="flex gap-3 2xl:flex-col 2xl:gap-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                        #{index + 1}
                      </div>
                      <span className="self-center rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 2xl:self-start">
                        {candidate.mode}
                      </span>
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
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="break-words">{candidate.location}</span>
                        <span>{candidate.yearsExperience}</span>
                        <span>{candidate.source}</span>
                        <span>{candidate.stage}</span>
                      </div>
                      <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-600">{candidate.summary}</p>

                      <div className="mt-4 grid gap-2">
                        {candidate.matchedSkills.length > 0 ? (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold uppercase text-emerald-700">Matched requirements</p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.matchedSkills.map((skill) => (
                                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200" key={skill}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {candidate.missingSkills.length > 0 ? (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold uppercase text-rose-700">Missing requirements</p>
                            <div className="flex flex-wrap gap-1.5">
                              {candidate.missingSkills.map((skill) => (
                                <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200" key={skill}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {candidate.matchedSkills.length === 0 && candidate.missingSkills.length === 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.skills.slice(0, 8).map((skill) => (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 rounded-lg bg-violet-50 p-3 ring-1 ring-violet-100">
                        <div className="mb-2 flex items-center gap-2">
                          <BrainCircuit className="h-3.5 w-3.5 text-violet-700" aria-hidden="true" />
                          <p className="text-xs font-semibold uppercase text-violet-700">AI Verdict</p>
                        </div>
                        <p className="text-sm leading-6 text-slate-700">
                          {buildAiVerdict(candidate, data.selectedJob?.title ?? "this role")}
                        </p>
                      </div>
                    </div>

                    <div className="grid content-start gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Match score</p>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.score)}`}>
                            {candidate.score}%
                          </span>
                        </div>
                        <div className="mt-3">
                          <ProgressBar value={candidate.score} />
                        </div>
                      </div>

                      <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <BrainCircuit className="h-3.5 w-3.5 text-violet-700" aria-hidden="true" />
                          <p className="text-xs font-semibold uppercase text-slate-500">Signal breakdown</p>
                        </div>
                        <div className="grid gap-2">
                          <SignalRow label="Skill coverage" value={candidate.signals.skillCoverage} />
                          <SignalRow label="Semantic fit" value={candidate.signals.semanticSimilarity} />
                          <SignalRow label="Experience" value={candidate.signals.experienceFit} />
                          <SignalRow label="Title match" value={candidate.signals.titleFit} />
                          <SignalRow label="Profile quality" value={candidate.signals.profileCompleteness} />
                        </div>
                      </div>

                      {candidate.strengths.length > 0 ? (
                        <div className="min-w-0 rounded-lg border border-slate-200 p-3">
                          <p className="text-xs font-semibold uppercase text-emerald-700">Confirmed signals</p>
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {candidate.strengths.slice(0, 2).map((strength) => (
                              <li className="break-words" key={strength}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {candidate.applicationId ? (
                        <AiAnalyzeButton applicationId={candidate.applicationId} />
                      ) : (
                        <form action={applyToJobFromMatching}>
                          <input name="candidateId" type="hidden" value={candidate.id} />
                          <input name="jobId" type="hidden" value={selectedJobId} />
                          <button
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                            disabled={!selectedJobId}
                            type="submit"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Add to role
                          </button>
                        </form>
                      )}

                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        href={`/candidates/${candidate.id}`}
                      >
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                        Profile
                      </Link>
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
      </div>
    </WorkspacePageShell>
  );
}
