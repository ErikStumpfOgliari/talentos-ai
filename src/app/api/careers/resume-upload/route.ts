import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSignedPublicResumeUploadTarget } from "@/lib/resume-storage";
import { MAX_RESUME_FILE_SIZE_BYTES, RESUME_FILE_TOO_LARGE_MESSAGE } from "@/lib/resume-upload-limits";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
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
