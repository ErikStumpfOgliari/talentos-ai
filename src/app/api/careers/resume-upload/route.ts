import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSignedPublicResumeUploadTarget } from "@/lib/resume-storage";
import { MAX_RESUME_FILE_SIZE_BYTES, RESUME_FILE_TOO_LARGE_MESSAGE } from "@/lib/resume-upload-limits";
import {
  checkSecurityRateLimitForRequest,
  isSecurityRateLimitError,
} from "@/lib/security-rate-limit";

export const runtime = "nodejs";

const SIGNED_UPLOAD_MAX_REQUESTS_PER_HOUR = 30;
const allowedResumeMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

const allowedResumeExtensions = /\.(csv|md|pdf|txt)$/i;

const signedUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  jobId: z.string().trim().min(1),
  mimeType: z.string().trim().max(160).optional(),
  sizeBytes: z.number().int().positive().max(MAX_RESUME_FILE_SIZE_BYTES),
});

function normalizeMimeType(mimeType?: string) {
  return mimeType?.trim() || "application/octet-stream";
}

function isAllowedResumeFile(fileName: string, mimeType: string) {
  return allowedResumeMimeTypes.has(mimeType) || allowedResumeExtensions.test(fileName);
}

function getHostname(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.split(",")[0]?.trim().split(":")[0]?.toLowerCase() || null;
  }
}

function requestHasAllowedOrigin(request: Request) {
  const host = getHostname(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const origin = getHostname(request.headers.get("origin"));
  const referer = getHostname(request.headers.get("referer"));

  if (!host) {
    return false;
  }

  if (origin && origin !== host) {
    return false;
  }

  if (referer && referer !== host) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  if (!requestHasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden upload origin." }, { status: 403 });
  }

  let input: z.infer<typeof signedUploadSchema>;

  try {
    input = signedUploadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const mimeType = normalizeMimeType(input.mimeType);

  if (!isAllowedResumeFile(input.fileName, mimeType)) {
    return NextResponse.json({ error: "Unsupported resume file type." }, { status: 400 });
  }

  if (input.sizeBytes > MAX_RESUME_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: RESUME_FILE_TOO_LARGE_MESSAGE }, { status: 413 });
  }

  const job = await prisma.job.findFirst({
    where: {
      id: input.jobId,
      status: "ACTIVE",
    },
    select: {
      organizationId: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "This job is not accepting applications." }, { status: 404 });
  }

  try {
    await checkSecurityRateLimitForRequest(request, {
      action: "public_resume_upload.signed",
      identityParts: [input.jobId],
      limit: SIGNED_UPLOAD_MAX_REQUESTS_PER_HOUR,
      metadata: {
        fileName: input.fileName,
        sizeBytes: input.sizeBytes,
      },
      organizationId: job.organizationId,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (isSecurityRateLimitError(error)) {
      return NextResponse.json({ error: "Too many resume upload requests. Try again later." }, { status: 429 });
    }

    throw error;
  }

  const target = await createSignedPublicResumeUploadTarget({
    fileName: input.fileName,
    mimeType,
    organizationId: job.organizationId,
  });

  if (!target) {
    return NextResponse.json(
      {
        code: "resume_storage_unconfigured",
        error: "Secure resume storage is not configured.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ...target,
    mimeType,
  });
}
