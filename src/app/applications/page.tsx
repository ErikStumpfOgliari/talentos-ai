import Link from "next/link";
import {
  BrainCircuit,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Filter,
  Inbox,
  MailCheck,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AiAnalyzeButton } from "@/components/ai-analyze-button";
import {
  advanceApplicationToScreening,
  applyResumeParsedDataFromInbox,
  createSchedulingLinkFromInbox,
  markResumeReviewedFromInbox,
  rejectApplicationFromInbox,
  runBulkApplicationsAction,
} from "@/app/applications/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { CandidateSource, ParserStatus } from "@/generated/prisma/client";
import { recruitingRoles, requireRole } from "@/lib/auth";
import {
  getApplicationsInboxData,
  type ApplicationsInboxFilters,
} from "@/lib/applications-data";

export const dynamic = "force-dynamic";

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400";

const scoreOptions = [
  { label: "Any score", value: "" },
  { label: "85+ strong", value: "high" },
  { label: "70-84 review", value: "mid" },
  { label: "Below 70", value: "low" },
];

const bulkFormId = "applications-bulk-action-form";

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getScoreTone(score: number) {
  if (score >= 85) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 70) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function getEmailTone(status?: string) {
  if (status === "Sent" || status === "Delivered") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Queued") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "Failed" || status === "Bounced") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getNotice(params: {
  advanced?: string;
  bulk?: string;
  count?: string;
  fields?: string;
  matches?: string;
  rejected?: string;
  resume?: string;
  scheduling?: string;
}) {
  const bulkCount = Number(params.count);
  const countLabel = Number.isFinite(bulkCount) && bulkCount > 0 ? bulkCount : 0;

  if (params.advanced) {
    return "Application moved to screening.";
  }

  if (params.scheduling) {
    return "Self-scheduling link created for the application.";
  }

  if (params.bulk === "empty") {
    return "Select at least one application.";
  }

  if (params.bulk === "missing-resume") {
    return "Selected applications do not have resumes to review.";
  }

  if (params.bulk === "screening") {
    return `${countLabel} applications moved to screening.`;
  }

  if (params.bulk === "schedule") {
    return `${countLabel} scheduling links created or reused.`;
  }

  if (params.bulk === "reviewed") {
    return `${countLabel} resumes marked reviewed.`;
  }

  if (params.bulk === "reject") {
    return `${countLabel} applications rejected.`;
  }

  if (params.resume === "reviewed") {
    return "Resume marked reviewed.";
  }

  if (params.resume === "applied") {
    const appliedFields = Number(params.fields);
    const refreshedMatches = Number(params.matches);
    const fieldLabel = Number.isFinite(appliedFields) && appliedFields > 0 ? `${appliedFields} selected fields` : "selected fields";
    const matchLabel =
      Number.isFinite(refreshedMatches) && refreshedMatches > 0
        ? ` Matching refreshed for ${refreshedMatches} applications.`
        : "";

    return `Parsed resume data applied to the candidate profile (${fieldLabel}).${matchLabel}`;
  }

  if (params.resume === "no-selection") {
    return "Select at least one parsed field to apply.";
  }

  if (params.resume === "no-parsed-data") {
    return "This resume does not have structured parsed data to apply.";
  }

  if (params.resume === "email-conflict") {
    return "Parsed email already belongs to another candidate in this organization.";
  }

  if (params.resume === "missing") {
    return "This application does not have a resume yet.";
  }

  if (params.rejected === "sent") {
    return "Application rejected and email sent.";
  }

  if (params.rejected === "failed") {
    return "Application rejected, but the email delivery failed.";
  }

  if (params.rejected === "closed") {
    return "Application rejected without email.";
  }

  if (params.rejected) {
    return "Application rejected and email queued.";
  }

  return null;
}

function readSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApplicationsInboxPage({
  searchParams,
}: {
  searchParams?: Promise<ApplicationsInboxFilters & {
    advanced?: string;
    bulk?: string;
    count?: string;
    fields?: string;
    matches?: string;
    rejected?: string;
    resume?: string;
    scheduling?: string;
  }>;
}) {
  const session = await requireRole(recruitingRoles);
  const params = (await searchParams) ?? {};
  const filters = {
    jobId: readSingleParam(params.jobId),
    parserStatus: readSingleParam(params.parserStatus),
    score: readSingleParam(params.score),
    source: readSingleParam(params.source),
    stageId: readSingleParam(params.stageId),
  };
  const data = await getApplicationsInboxData({
    filters,
    organizationId: session.organization.id,
  });
  const notice = getNotice(params);

  return (
    <WorkspacePageShell
      actions={
        <>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href="/careers"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Careers
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
            href="/jobs"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            Jobs
          </Link>
        </>
      }
      icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      title="Applications Inbox"
    >
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Active intake", value: data.stats.total, icon: Inbox, tone: "text-slate-700" },
              { label: "New today", value: data.stats.newToday, icon: Clock3, tone: "text-sky-700" },
              { label: "Manual review", value: data.stats.needsReview, icon: FileSearch, tone: "text-amber-700" },
              { label: "Strong matches", value: data.stats.highScore, icon: Sparkles, tone: "text-violet-700" },
              { label: "Avg score", value: `${data.stats.averageScore}%`, icon: CheckCircle2, tone: "text-emerald-700" },
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
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]" method="get">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Job</span>
                <select className={selectClass} defaultValue={data.filters.jobId ?? ""} name="jobId">
                  <option value="">All jobs</option>
                  {data.jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Stage</span>
                <select className={selectClass} defaultValue={data.filters.stageId ?? ""} name="stageId">
                  <option value="">All stages</option>
                  {data.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Resume</span>
                <select className={selectClass} defaultValue={data.filters.parserStatus ?? ""} name="parserStatus">
                  <option value="">Any status</option>
                  {Object.values(ParserStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnum(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Source</span>
                <select className={selectClass} defaultValue={data.filters.source ?? ""} name="source">
                  <option value="">All sources</option>
                  {Object.values(CandidateSource).map((source) => (
                    <option key={source} value={source}>
                      {formatEnum(source)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Score</span>
                <select className={selectClass} defaultValue={data.filters.score ?? ""} name="score">
                  {scoreOptions.map((score) => (
                    <option key={score.value} value={score.value}>
                      {score.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  Filter
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <form action={runBulkApplicationsAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" id={bulkFormId}>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Bulk actions</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{data.applications.length} visible applications</p>
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Rejection template</span>
                <select className={selectClass} name="templateId" defaultValue="">
                  <option value="">No email template</option>
                  {data.rejectionTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={data.applications.length === 0}
                  name="bulkAction"
                  type="submit"
                  value="screening"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Screening
                </button>
              </div>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-sky-300"
                  disabled={data.applications.length === 0}
                  name="bulkAction"
                  type="submit"
                  value="schedule"
                >
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Schedule
                </button>
              </div>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-300"
                  disabled={data.applications.length === 0}
                  name="bulkAction"
                  type="submit"
                  value="reviewed"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Reviewed
                </button>
              </div>
              <div className="flex items-end">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                  disabled={data.applications.length === 0}
                  name="bulkAction"
                  type="submit"
                  value="reject"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  Reject
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-3">
            {data.applications.map((application) => (
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={application.id}>
                <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                        <input
                          aria-label={`Select ${application.candidate.name}`}
                          className="h-4 w-4 rounded border-slate-300"
                          form={bulkFormId}
                          name="applicationIds"
                          type="checkbox"
                          value={application.id}
                        />
                        Select
                      </label>
                      <Link className="text-base font-semibold text-slate-950 transition hover:text-slate-600" href={`/candidates/${application.candidate.id}`}>
                        {application.candidate.name}
                      </Link>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(application.matchScore)}`}>
                        {application.matchScore}% match
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${application.stage.tone}`}>
                        {application.stage.name}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                        {application.job.title}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                        {application.candidate.title}
                      </span>
                      <span>{application.source}</span>
                      <span>Applied {application.appliedAt}</span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{application.summary}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {application.topSkills.slice(0, 5).map((skill) => (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                          {skill}
                        </span>
                      ))}
                      {application.topSkills.length === 0 ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">No skills</span>
                      ) : null}
                    </div>

                    {application.latestResume ? (
                      <div
                        className={`mt-4 rounded-lg border p-3 ${
                          application.latestResume.needsManualReview
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase text-slate-500">Resume parse preview</p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{application.latestResume.fileName}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${application.latestResume.tone}`}>
                            {application.latestResume.reviewedAt ? "Reviewed" : application.latestResume.status}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">{application.latestResume.preview.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                            Source: {application.latestResume.preview.parserSource}
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                            Skills: {application.latestResume.preview.skills.length}
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                            Experience:{" "}
                            {application.latestResume.preview.yearsExperience
                              ? `${Math.round(application.latestResume.preview.yearsExperience)} yrs`
                              : application.latestResume.preview.experienceCount}
                          </span>
                          <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">
                            Education: {application.latestResume.preview.educationCount}
                          </span>
                        </div>
                        {application.latestResume.preview.skills.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {application.latestResume.preview.skills.slice(0, 6).map((skill) => (
                              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200" key={skill}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {application.latestResume.profileUpdate ? (
                          <form action={applyResumeParsedDataFromInbox} className="mt-3 rounded-lg border border-white/80 bg-white p-3">
                            <input name="applicationId" type="hidden" value={application.id} />
                            <input name="resumeId" type="hidden" value={application.latestResume.id} />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">Profile update</p>
                                <p className="mt-1 text-sm font-semibold text-slate-950">Apply parsed data to candidate</p>
                                <p className="mt-1 text-xs text-slate-500">Selected fields refresh profile data and matching scores.</p>
                              </div>
                              <button
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                type="submit"
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Apply selected
                              </button>
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {application.latestResume.profileUpdate.fields.map((field) => (
                                <label
                                  className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm"
                                  key={field.key}
                                >
                                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value={field.key} />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase text-slate-500">{field.label}</span>
                                    <span className="mt-0.5 block truncate font-semibold text-slate-950">{field.parsedValue}</span>
                                    <span className="mt-0.5 block truncate text-xs text-slate-500">Current: {field.currentValue}</span>
                                  </span>
                                </label>
                              ))}
                              {application.latestResume.profileUpdate.skills.length > 0 ? (
                                <label className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="skills" />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase text-slate-500">Skills</span>
                                    <span className="mt-0.5 block truncate font-semibold text-slate-950">
                                      {application.latestResume.profileUpdate.skills.slice(0, 5).join(", ")}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                      {application.latestResume.profileUpdate.skills.length} new skills
                                    </span>
                                  </span>
                                </label>
                              ) : null}
                              {application.latestResume.profileUpdate.educationCount > 0 ? (
                                <label className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="education" />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase text-slate-500">Education</span>
                                    <span className="mt-0.5 block font-semibold text-slate-950">
                                      Replace education ({application.latestResume.profileUpdate.educationCount})
                                    </span>
                                  </span>
                                </label>
                              ) : null}
                              {application.latestResume.profileUpdate.experienceCount > 0 ? (
                                <label className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                                  <input className="mt-1 h-4 w-4 rounded border-slate-300" defaultChecked name="fields" type="checkbox" value="experience" />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold uppercase text-slate-500">Experience</span>
                                    <span className="mt-0.5 block font-semibold text-slate-950">
                                      Replace experience ({application.latestResume.profileUpdate.experienceCount})
                                    </span>
                                  </span>
                                </label>
                              ) : null}
                            </div>
                          </form>
                        ) : null}
                      </div>
                    ) : null}

                    {application.aiAnalysis ? (
                      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-violet-700" aria-hidden="true" />
                            <p className="text-xs font-semibold uppercase text-violet-700">AI Analysis</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(application.aiAnalysis.score)}`}>
                              {application.aiAnalysis.score}/100
                            </span>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                              application.aiAnalysis.recommendation === "avancar"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : application.aiAnalysis.recommendation === "talvez"
                                  ? "bg-sky-50 text-sky-700 ring-sky-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200"
                            }`}>
                              {application.aiAnalysis.recommendation === "avancar"
                                ? "Advance"
                                : application.aiAnalysis.recommendation === "talvez"
                                  ? "Maybe"
                                  : "Low fit"}
                            </span>
                          </div>
                        </div>
                        {application.aiAnalysis.summary ? (
                          <p className="mt-2 text-sm leading-6 text-slate-700">{application.aiAnalysis.summary}</p>
                        ) : null}
                        {application.aiAnalysis.experienceSummary ? (
                          <p className="mt-1 text-xs text-slate-600">{application.aiAnalysis.experienceSummary}</p>
                        ) : null}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {application.aiAnalysis.matchedRequirements.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold uppercase text-emerald-700">Matched</p>
                              <ul className="mt-1 space-y-0.5">
                                {application.aiAnalysis.matchedRequirements.slice(0, 4).map((req) => (
                                  <li className="text-xs text-slate-700" key={req}>
                                    + {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {application.aiAnalysis.missingRequirements.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold uppercase text-rose-700">Missing</p>
                              <ul className="mt-1 space-y-0.5">
                                {application.aiAnalysis.missingRequirements.slice(0, 4).map((req) => (
                                  <li className="text-xs text-slate-700" key={req}>
                                    - {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                        {application.aiAnalysis.skillsFound.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {application.aiAnalysis.skillsFound.slice(0, 8).map((skill) => (
                              <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200" key={skill}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-400">Analyzed {application.aiAnalysis.analyzedAt}</p>
                      </div>
                    ) : application.aiAnalysisStatus === "FAILED" ? (
                      <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-4 w-4 text-rose-700" aria-hidden="true" />
                          <p className="text-xs font-semibold uppercase text-rose-700">AI Analysis failed</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Could not read the resume. Ask the candidate to upload a PDF or DOCX with selectable text.
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Resume</p>
                        <p className="mt-1 truncate font-semibold text-slate-950">{application.latestResume?.fileName ?? "Missing"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {application.latestResume?.reviewedAt
                            ? `Reviewed by ${application.latestResume.reviewedBy ?? "team"}`
                            : application.latestResume?.needsManualReview
                              ? "Manual review pending"
                              : application.latestResume
                                ? `Parsed ${application.latestResume.parsedAt}`
                                : "No upload"}
                        </p>
                        {application.latestResume?.downloadUrl ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Link
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              href={application.latestResume.viewerUrl}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              View resume
                            </Link>
                            <a
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              href={application.latestResume.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              Open resume
                            </a>
                            <a
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              href={`${application.latestResume.downloadUrl}?download=1`}
                            >
                              <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                              Download file
                            </a>
                          </div>
                        ) : application.latestResume ? (
                          <div className="mt-2 grid gap-2">
                            <Link
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              href={application.latestResume.viewerUrl}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              View resume
                            </Link>
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium leading-5 text-amber-700">
                              Original file unavailable. Review extracted text in the viewer.
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Confirmation</p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getEmailTone(application.confirmationEmail?.status)}`}
                        >
                          {application.confirmationEmail?.status ?? "Not sent"}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">{application.confirmationEmail?.provider ?? "No provider"}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Interviews</p>
                        <p className="mt-1 font-semibold text-slate-950">{application.interviewCount}</p>
                        <p className="mt-1 text-xs text-slate-500">{application.hasActiveSchedulingLink ? "Scheduling link active" : "No active link"}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Contact</p>
                        <p className="mt-1 truncate font-semibold text-slate-950">{application.candidate.email}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{application.candidate.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 content-start gap-3">
                    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        href={`/candidates/${application.candidate.id}`}
                      >
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                        Profile
                      </Link>
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        href={`/jobs/${application.job.id}`}
                      >
                        <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                        Job
                      </Link>
                    </div>

                    {application.publicStatusPath ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        href={application.publicStatusPath}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Candidate status
                      </Link>
                    ) : null}

                    {application.latestResume ? (
                      <form action={markResumeReviewedFromInbox}>
                        <input name="applicationId" type="hidden" value={application.id} />
                        <button
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          disabled={Boolean(application.latestResume.reviewedAt)}
                          type="submit"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {application.latestResume.reviewedAt ? "Resume reviewed" : "Mark resume reviewed"}
                        </button>
                      </form>
                    ) : null}

                    <form action={advanceApplicationToScreening}>
                      <input name="applicationId" type="hidden" value={application.id} />
                      <button
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        type="submit"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Move to screening
                      </button>
                    </form>

                    {application.schedulingPath ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                        href={application.schedulingPath}
                      >
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        Scheduling link
                      </Link>
                    ) : (
                      <form action={createSchedulingLinkFromInbox}>
                        <input name="applicationId" type="hidden" value={application.id} />
                        <button
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                          type="submit"
                        >
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          Create schedule link
                        </button>
                      </form>
                    )}

                    <AiAnalyzeButton applicationId={application.id} />

                    <form action={rejectApplicationFromInbox} className="grid gap-2 rounded-lg border border-rose-100 bg-rose-50 p-2">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <select className="h-9 w-full min-w-0 rounded-lg border border-rose-200 bg-white px-2 text-sm text-slate-900 outline-none" name="templateId" defaultValue="">
                        <option value="">No email template</option>
                        {data.rejectionTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        type="submit"
                      >
                        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}

            {data.applications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-950">No applications found</p>
                <p className="mt-1 text-sm text-slate-500">Adjust filters or wait for new public applications.</p>
              </div>
            ) : null}
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Manual review queue</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 2xl:grid-cols-1">
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase text-amber-700">Pending</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{data.stats.needsReview}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-xs font-semibold uppercase text-rose-700">Failed</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{data.stats.failedParsing}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">Reviewed</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{data.stats.reviewedResumes}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {data.manualReviewQueue.map((item) => (
                <Link
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:bg-amber-100"
                  href={`/candidates/${item.candidateId}`}
                  key={item.applicationId}
                >
                  <p className="truncate text-sm font-semibold text-slate-950">{item.candidateName}</p>
                  <p className="mt-1 truncate text-xs text-slate-600">{item.jobTitle}</p>
                  <p className="mt-1 truncate text-xs font-medium text-amber-700">
                    {item.resumeFileName} - {item.status}
                  </p>
                </Link>
              ))}
              {data.manualReviewQueue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-3">
                  <p className="text-sm font-semibold text-slate-950">No resumes waiting review</p>
                  <p className="mt-1 text-xs text-slate-500">New parsing exceptions will appear here.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Confirmation queue</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Queued emails</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{data.stats.queuedConfirmations}</p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Rejection templates</p>
            </div>
            <div className="grid gap-2">
              {data.rejectionTemplates.map((template) => (
                <div className="rounded-lg border border-slate-200 p-3" key={template.id}>
                  <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                </div>
              ))}
              {data.rejectionTemplates.length === 0 ? (
                <Link className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 hover:bg-slate-50" href="/email-automation#new-template">
                  Create rejection template
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
