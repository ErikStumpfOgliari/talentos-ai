import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  RefreshCcw,
  Save,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  addCandidateNote,
  applyResumeParsedData,
  attachCandidateResume,
  deleteCandidate,
  updateCandidateProfile,
} from "@/app/candidates/actions";
import { AiAnalyzeButton } from "@/components/ai-analyze-button";
import { CandidateResumeAttachmentForm } from "@/components/candidate-resume-attachment-form";
import { DeleteCandidateForm } from "@/components/delete-candidate-form";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getCandidateDetailData } from "@/lib/candidate-detail-data";
import { RESUME_FILE_UNDER_LIMIT_MESSAGE } from "@/lib/resume-upload-limits";
import { LONG_TEXT_LIMIT_HINT, TEXT_LIMITS } from "@/lib/text-limits";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

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

function getStatusTone(status: string) {
  if (status === "Active" || status === "Parsed" || status === "Sent" || status === "Delivered" || status === "Completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Queued" || status === "Scheduled") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "Failed" || status === "Rejected" || status === "Bounced" || status === "Cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getRecommendationTone(rec: string | null) {
  if (rec === "avancar") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (rec === "talvez") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (rec === "rejeitar") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getRecommendationLabel(rec: string | null) {
  if (rec === "avancar") return "Advance";
  if (rec === "talvez") return "Consider";
  if (rec === "rejeitar") return "Reject";
  return rec ?? "Unknown";
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StatCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  tone: string;
  value: string | number;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden={true} />
      </div>
      <p className="mt-3 break-words text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateId: string }>;
  searchParams?: Promise<{ note?: string; profile?: string; resume?: string }>;
}) {
  const session = await requireRole(recruitingRoles);
  const { candidateId } = await params;
  const query = await searchParams;
  const data = await getCandidateDetailData({
    candidateId,
    organizationId: session.organization.id,
  });

  if (!data) {
    notFound();
  }

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
            href="/interviews"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Interviews
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
            href="/email-automation"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Emails
          </Link>
        </>
      }
      icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      title={data.candidate.name}
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{data.candidate.source}</span>
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-all">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {data.candidate.email}
          </span>
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-all">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {data.candidate.phone}
          </span>
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 break-words">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {data.candidate.location}
          </span>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={BriefcaseBusiness} label="Applications" tone="text-sky-700" value={data.stats.applications} />
          <StatCard icon={Sparkles} label="Avg match" tone="text-violet-700" value={`${data.stats.avgScore}%`} />
          <StatCard icon={CalendarDays} label="Interviews" tone="text-emerald-700" value={data.stats.interviews} />
          <StatCard icon={Mail} label="Emails" tone="text-amber-700" value={data.stats.emails} />
          <StatCard icon={FileText} label="Resumes" tone="text-slate-700" value={data.stats.resumes} />
        </section>

        {query?.note || query?.profile || query?.resume ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              query?.resume === "email-conflict" || query?.resume === "missing" || query?.resume === "parse-failed" || query?.resume === "too-large"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : query?.resume === "needs-review" ||
                  query?.resume === "no-parsed-data" ||
                  query?.resume === "no-selection" ||
                  query?.resume === "review-ready"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {query?.profile
              ? "Candidate profile updated."
              : query?.note
              ? "Candidate note saved."
              : query?.resume === "missing"
              ? "Attach a resume file or paste resume text before reprocessing."
              : query?.resume === "too-large"
              ? RESUME_FILE_UNDER_LIMIT_MESSAGE
              : query?.resume === "email-conflict"
              ? "Parsed email already belongs to another candidate."
              : query?.resume === "parse-failed"
              ? "Resume review could not be completed automatically. The file was saved for manual review."
              : query?.resume === "no-selection"
              ? "Select at least one extracted field to apply."
              : query?.resume === "no-parsed-data"
              ? "This resume has no structured parsed data to apply."
              : query?.resume === "review-ready"
              ? "Resume reviewed locally. Review extracted data before applying it."
              : query?.resume === "applied"
              ? "Selected resume data applied to candidate profile."
              : "Resume attached for review."}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,390px)]">
          <div className="min-w-0 space-y-5">
            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Candidate profile</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                <div>
                  <p className="break-words text-base font-semibold text-slate-950">{data.candidate.currentTitle}</p>
                  <p className="mt-3 break-words text-sm leading-6 text-slate-600">{data.candidate.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {data.skills.map((skill) => (
                      <span className="dashboard-chip rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                        {skill}
                      </span>
                    ))}
                    {data.skills.length === 0 ? (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">No skills yet</span>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  {[
                    ["Experience", data.candidate.yearsExperience],
                    ["Availability", data.candidate.availability],
                    ["Target salary", data.candidate.salaryExpectation],
                    ["Added", data.candidate.createdAt],
                  ].map(([label, value]) => (
                    <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Role history and match explanations</p>
              </div>
              <div className="grid gap-3">
                {data.applications.map((application) => (
                  <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4" key={application.id}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <Link className="break-words text-base font-semibold text-slate-950 transition hover:text-slate-600" href={`/jobs/${application.jobId}`}>
                          {application.jobTitle}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className={`rounded-full px-2 py-1 font-semibold ring-1 ${getStatusTone(application.status)}`}>
                            {application.status}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">{application.stage}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">{application.source}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex flex-wrap justify-end gap-2">
                          <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(application.matchScore)}`}>
                            {application.matchScore > 0 ? `${application.matchScore}% match` : "Not ranked"}
                          </span>
                          {application.aiRecommendation ? (
                            <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getRecommendationTone(application.aiRecommendation)}`}>
                              {getRecommendationLabel(application.aiRecommendation)}
                            </span>
                          ) : null}
                        </div>
                        <AiAnalyzeButton applicationId={application.id} />
                      </div>
                    </div>

                    {application.aiAnalysisStatus === "SUCCESS" ? (
                      <div className="mt-4 space-y-3">
                        {application.aiSummary ? (
                          <p className="text-sm leading-6 text-slate-700">{application.aiSummary}</p>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg bg-emerald-50 p-3">
                            <p className="text-xs font-semibold uppercase text-emerald-700">Matched requirements</p>
                            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                              {(application.strengths.length ? application.strengths : ["No requirements matched."]).map((item) => (
                                <li className="flex gap-2" key={item}>
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                                  <span className="min-w-0 break-words">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg bg-amber-50 p-3">
                            <p className="text-xs font-semibold uppercase text-amber-700">Missing requirements</p>
                            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                              {(application.gaps.length ? application.gaps : ["No gaps identified."]).map((item) => (
                                <li className="flex gap-2" key={item}>
                                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                                  <span className="min-w-0 break-words">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {application.aiSkillsFound.length > 0 ? (
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Skills found in resume</p>
                            <div className="flex flex-wrap gap-1.5">
                              {application.aiSkillsFound.map((skill) => (
                                <span className="rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700" key={skill}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {application.aiExperienceSummary ? (
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Experience summary</p>
                            <p className="text-sm leading-6 text-slate-600">{application.aiExperienceSummary}</p>
                          </div>
                        ) : null}
                        {application.aiRiskPoints.length > 0 ? (
                          <div className="rounded-lg bg-rose-50 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-rose-700">Points of attention</p>
                            <ul className="space-y-1.5 text-sm text-slate-600">
                              {application.aiRiskPoints.map((point) => (
                                <li className="flex gap-2" key={point}>
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                                  <span className="min-w-0 break-words">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : application.aiAnalysisStatus === "PROCESSING" ? (
                      <div className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-700">Analysis in progress…</div>
                    ) : application.aiAnalysisStatus === "FAILED" ? (
                      <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Last analysis failed. Try re-analyzing above.</div>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-emerald-700">Strengths</p>
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {(application.strengths.length ? application.strengths : ["No strengths saved yet."]).map((item) => (
                              <li className="flex gap-2" key={item}>
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                                <span className="min-w-0 break-words">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-amber-700">Gaps</p>
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {(application.gaps.length ? application.gaps : ["No gaps saved yet."]).map((item) => (
                              <li className="flex gap-2" key={item}>
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                                <span className="min-w-0 break-words">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Applied {application.appliedAt}</span>
                      <span>Stage entered {application.stageEnteredAt}</span>
                      <span>Job {application.jobStatus}</span>
                      {application.aiAnalyzedAt ? <span>AI analyzed {application.aiAnalyzedAt}</span> : null}
                    </div>
                  </article>
                ))}
                {data.applications.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No applications yet.</p>
                ) : null}
              </div>
            </section>

            <section className="min-w-0 scroll-mt-24 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="resume-history">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Parsed resumes</p>
              </div>
              <div className="grid gap-3">
                {data.resumes.map((resume) => (
                  <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-4" key={resume.id}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{resume.fileName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {resume.mimeType} - {resume.size} - {resume.storageLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Link
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          href={resume.viewerUrl}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          View resume
                        </Link>
                        {resume.downloadUrl ? (
                          <a
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            href={`${resume.downloadUrl}?download=1`}
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Download file
                          </a>
                        ) : (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Original file unavailable
                          </span>
                        )}
                        <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(resume.parserStatus)}`}>
                          {resume.parserStatus}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 break-words text-sm leading-6 text-slate-600">{resume.parsedSummary}</p>
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Raw preview</p>
                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{resume.rawPreview}</p>
                    </div>
                    {resume.review?.canApply ? (
                      <form action={applyResumeParsedData} className="mt-4 rounded-lg border border-violet-100 bg-violet-50/70 p-3">
                        <input name="candidateId" type="hidden" value={data.candidate.id} />
                        <input name="resumeId" type="hidden" value={resume.id} />
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-violet-700" aria-hidden="true" />
                          <p className="text-xs font-semibold uppercase text-violet-800">Review extracted data</p>
                        </div>
                        {resume.review.fields.length > 0 ? (
                          <div className="grid gap-2">
                            {resume.review.fields.map((field) => (
                              <label className="grid min-w-0 gap-2 rounded-lg border border-white bg-white p-3 shadow-sm" key={field.key}>
                                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                                  <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value={field.key} />
                                  <span className="min-w-0 break-words">{field.label}</span>
                                </span>
                                <span className="grid min-w-0 gap-2 text-xs text-slate-500 md:grid-cols-2">
                                  <span className="rounded-md bg-slate-50 px-2 py-1 break-words">
                                    Current: <span className="font-semibold text-slate-700">{field.currentValue}</span>
                                  </span>
                                  <span className="rounded-md bg-violet-50 px-2 py-1 break-words">
                                    Parsed: <span className="font-semibold text-violet-800">{field.parsedValue}</span>
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-2">
                          {resume.review.skills.length > 0 ? (
                            <label className="min-w-0 rounded-lg border border-white bg-white p-3 shadow-sm">
                              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                                <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="skills" />
                                Replace skills
                              </span>
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {resume.review.skills.slice(0, 10).map((skill) => (
                                  <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800" key={skill}>
                                    {skill}
                                  </span>
                                ))}
                              </span>
                            </label>
                          ) : null}
                          {resume.review.educationCount > 0 ? (
                            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-white bg-white p-3 text-sm font-semibold text-slate-900 shadow-sm">
                              <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="education" />
                              <span className="min-w-0 break-words">Replace education ({resume.review.educationCount})</span>
                            </label>
                          ) : null}
                          {resume.review.experienceCount > 0 ? (
                            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-white bg-white p-3 text-sm font-semibold text-slate-900 shadow-sm">
                              <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="experience" />
                              <span className="min-w-0 break-words">Replace experience ({resume.review.experienceCount})</span>
                            </label>
                          ) : null}
                        </div>
                        <button
                          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white transition hover:bg-violet-800"
                          type="submit"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Apply selected data
                        </button>
                      </form>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-500">Parsed {resume.parsedAt}</p>
                  </article>
                ))}
                {data.resumes.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No resumes stored yet.</p>
                ) : null}
              </div>
            </section>

            <section className="grid min-w-0 gap-5 xl:grid-cols-2">
              <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Interviews</p>
                </div>
                <div className="space-y-2">
                  {data.interviews.map((interview) => (
                    <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-3" key={interview.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{interview.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{interview.jobTitle} - {interview.type}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(interview.status)}`}>
                          {interview.status}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-xs text-slate-500">{interview.startsAt} - {interview.organizer}</p>
                      {interview.meetingUrl ? (
                        <a className="mt-2 inline-flex text-xs font-semibold text-slate-700 hover:text-slate-950" href={interview.meetingUrl} rel="noreferrer" target="_blank">
                          Meeting link
                        </a>
                      ) : null}
                    </article>
                  ))}
                  {data.interviews.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No interviews yet.</p>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Email history</p>
                </div>
                <div className="space-y-2">
                  {data.emails.map((email) => (
                    <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-3" key={email.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{email.subject}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{email.jobTitle} - {email.template}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(email.status)}`}>
                          {email.status}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{email.bodyPreview}</p>
                      <p className="mt-2 break-words text-xs text-slate-500">{email.trigger} - {email.sentAt}</p>
                    </article>
                  ))}
                  {data.emails.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No emails yet.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Save className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Edit profile</p>
              </div>
              <form action={updateCandidateProfile} className="grid gap-3">
                <input name="candidateId" type="hidden" value={data.candidate.id} />
                <Field label="Name">
                  <input className={inputClass} defaultValue={data.candidate.editable.name} name="name" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email">
                    <input className={inputClass} defaultValue={data.candidate.editable.email} name="email" type="email" />
                  </Field>
                  <Field label="Phone">
                    <input className={inputClass} defaultValue={data.candidate.editable.phone} name="phone" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <input className={inputClass} defaultValue={data.candidate.editable.currentTitle} name="currentTitle" />
                  </Field>
                  <Field label="Location">
                    <input className={inputClass} defaultValue={data.candidate.editable.location} name="location" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Source">
                    <select className={inputClass} defaultValue={data.candidate.editable.source} name="source">
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
                    <input
                      className={inputClass}
                      defaultValue={data.candidate.editable.yearsExperience ?? ""}
                      min="0"
                      name="yearsExperience"
                      type="number"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Currency">
                    <input className={inputClass} defaultValue={data.candidate.editable.currency} maxLength={3} name="currency" />
                  </Field>
                  <Field label="Salary">
                    <input
                      className={inputClass}
                      defaultValue={data.candidate.editable.salaryExpectation ?? ""}
                      min="0"
                      name="salaryExpectation"
                      type="number"
                    />
                  </Field>
                  <Field label="Availability">
                    <input className={inputClass} defaultValue={data.candidate.editable.availability} name="availability" />
                  </Field>
                </div>
                <Field label="Summary">
                  <textarea className={textareaClass} defaultValue={data.candidate.editable.summary} maxLength={TEXT_LIMITS.longText} name="summary" />
                  <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
                </Field>
                <Field label="Skills">
                  <textarea className={textareaClass} defaultValue={data.skills.join("\n")} maxLength={TEXT_LIMITS.longText} name="skills" />
                  <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
                </Field>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save profile
                </button>
              </form>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-violet-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Attach resume</p>
              </div>
              <CandidateResumeAttachmentForm action={attachCandidateResume} candidateId={data.candidate.id} />
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-950">Danger zone</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Remove this candidate and all related recruiting records from this workspace.
                </p>
              </div>
              <DeleteCandidateForm action={deleteCandidate} candidateId={data.candidate.id} candidateName={data.candidate.name} />
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Add note</p>
              </div>
              <form action={addCandidateNote} className="grid gap-3">
                <input name="candidateId" type="hidden" value={data.candidate.id} />
                <Field label="Context">
                  <select className={inputClass} name="applicationId" defaultValue="">
                    <option value="">Candidate profile</option>
                    {data.applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.jobTitle}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Visibility">
                  <select className={inputClass} name="visibility" defaultValue="TEAM">
                    <option value="TEAM">Team</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </Field>
                <Field label="Note">
                  <textarea
                    className={textareaClass}
                    maxLength={TEXT_LIMITS.longText}
                    name="body"
                    placeholder="Add recruiter context, screening notes, or next steps."
                    required
                  />
                  <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
                </Field>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  Save note
                </button>
              </form>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Notes</p>
              </div>
              <div className="space-y-2">
                {data.notes.map((note) => (
                  <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-3" key={note.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{note.context}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{note.author} - {note.createdAt}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {note.visibility}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-600">{note.body}</p>
                  </article>
                ))}
                {data.notes.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No notes yet.</p>
                ) : null}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Experience and education</p>
              </div>
              <div className="space-y-3">
                {data.experience.map((experience) => (
                  <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-3" key={experience.id}>
                    <p className="break-words text-sm font-semibold text-slate-950">{experience.title}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{experience.company} - {experience.period}</p>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-600">{experience.description}</p>
                  </article>
                ))}
                {data.education.map((education) => (
                  <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 p-3" key={education.id}>
                    <p className="break-words text-sm font-semibold text-slate-950">{education.label}</p>
                  </article>
                ))}
                {data.experience.length === 0 && data.education.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No education or experience details yet.</p>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </WorkspacePageShell>
  );
}
