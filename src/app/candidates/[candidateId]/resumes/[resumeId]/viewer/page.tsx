import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDownloadStoredResume } from "@/lib/resume-storage";

export const dynamic = "force-dynamic";

function formatDateTime(date?: Date | null, timezone = "America/Sao_Paulo") {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getParsedSummary(parsedData: unknown) {
  if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
    return null;
  }

  const parsed = parsedData as Record<string, unknown>;
  const summary = readText(parsed.summary);
  const message = readText(parsed.message);
  const source = readText(parsed.source);
  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 12)
    : [];

  return {
    message,
    skills,
    source,
    summary,
  };
}

export default async function ResumeViewerPage({
  params,
}: {
  params: Promise<{
    candidateId: string;
    resumeId: string;
  }>;
}) {
  const session = await requireRole(recruitingRoles);
  const { candidateId, resumeId } = await params;
  const resume = await prisma.resumeDocument.findFirst({
    where: {
      candidateId,
      id: resumeId,
      organizationId: session.organization.id,
    },
    include: {
      candidate: {
        select: {
          name: true,
        },
      },
      organization: {
        select: {
          timezone: true,
        },
      },
    },
  });

  if (!resume) {
    notFound();
  }

  const fileUrl = `/candidates/${candidateId}/resumes/${resumeId}`;
  const downloadUrl = `${fileUrl}?download=1`;
  const fileAvailable = canDownloadStoredResume(resume.fileKey, resume.fileUrl);
  const parsedSummary = getParsedSummary(resume.parsedData);
  const rawPreview = resume.rawText?.trim() || null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-5 text-slate-950" data-app-theme-scope>
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            href={`/candidates/${candidateId}#resume-history`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to candidate profile
          </Link>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase text-slate-500">Resume viewer</p>
                  <h1 className="break-words text-2xl font-semibold text-slate-950">{resume.fileName}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {resume.candidate.name} - {formatEnum(resume.parserStatus)} - Uploaded {formatDateTime(resume.createdAt, resume.organization.timezone)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {fileAvailable ? (
                <>
                  <a
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    href={fileUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open file
                  </a>
                  <a
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    href={downloadUrl}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            {fileAvailable ? (
              <iframe
                className="h-[78vh] min-h-[520px] w-full rounded-lg border border-slate-200 bg-slate-50"
                src={fileUrl}
                title={`Resume file - ${resume.fileName}`}
              />
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
                <div className="max-w-xl">
                  <FileText className="mx-auto h-10 w-10 text-amber-700" aria-hidden="true" />
                  <h2 className="mt-4 text-xl font-semibold text-amber-950">Original file is not available</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    This application was received, but the uploaded document was not persisted in secure storage. You can still review the extracted text and parsing notes below.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Access</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This page is protected by the recruiter workspace session. Parser review status does not block file viewing.
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">File status</p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Original file</p>
                  <p className="mt-1 font-semibold text-slate-950">{fileAvailable ? "Available" : "Unavailable"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Review</p>
                  <p className="mt-1 font-semibold text-slate-950">{formatEnum(resume.parserStatus)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Type</p>
                  <p className="mt-1 break-words font-semibold text-slate-950">{resume.mimeType ?? "Unknown"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">Extracted review</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {parsedSummary?.summary ?? parsedSummary?.message ?? "No structured summary is available yet."}
              </p>
              {parsedSummary?.source ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  Source: {parsedSummary.source}
                </p>
              ) : null}
              {parsedSummary?.skills.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parsedSummary.skills.map((skill) => (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            {rawPreview ? (
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">Readable text</p>
                <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  {rawPreview}
                </p>
              </section>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
