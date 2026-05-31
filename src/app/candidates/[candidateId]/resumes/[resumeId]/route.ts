import { NextResponse } from "next/server";
import { recruitingRoles, getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readResumeFile } from "@/lib/resume-storage";

export const runtime = "nodejs";

function buildDownloadFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "").trim() || "resume";
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      candidateId: string;
      resumeId: string;
    }>;
  },
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(recruitingRoles as readonly string[]).includes(session.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { candidateId, resumeId } = await params;
  const resume = await prisma.resumeDocument.findFirst({
    where: {
      id: resumeId,
      candidateId,
      organizationId: session.organization.id,
    },
    select: {
      fileKey: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
    },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  try {
    const storedFile = await readResumeFile({
      fileKey: resume.fileKey,
      fileUrl: resume.fileUrl,
    });

    const body = storedFile.bytes.buffer.slice(
      storedFile.bytes.byteOffset,
      storedFile.bytes.byteOffset + storedFile.bytes.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Content-Disposition": `attachment; filename="${buildDownloadFileName(resume.fileName)}"`,
        "Content-Type": resume.mimeType ?? "application/octet-stream",
      },
    });
  } catch {
    return NextResponse.json({ error: "Resume file is not available" }, { status: 404 });
  }
}
