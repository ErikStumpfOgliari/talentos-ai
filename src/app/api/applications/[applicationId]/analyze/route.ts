import { NextRequest, NextResponse } from "next/server";
import { AiAnalysisStatus } from "@/generated/prisma/client";
import { getCurrentSession, recruitingRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeResumeWithGroq } from "@/lib/resume-ai-analyzer";
import { extractResumeText, validateResumeText } from "@/lib/resume-text-extractor";
import { readResumeFile } from "@/lib/resume-storage";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const session = await getCurrentSession();

  if (!session || !(recruitingRoles as readonly string[]).includes(session.membership.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { applicationId } = await params;
  const organizationId = session.organization.id;

  const application = await prisma.application.findFirst({
    where: { id: applicationId, organizationId },
    include: {
      candidate: {
        include: {
          resumes: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      job: true,
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const resume = application.candidate.resumes[0];

  if (!resume) {
    return NextResponse.json({ error: "No resume found for this candidate." }, { status: 422 });
  }

  if (!resume.mimeType) {
    return NextResponse.json({ error: "Resume file type is unknown." }, { status: 422 });
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { aiAnalysisStatus: AiAnalysisStatus.PROCESSING },
  });

  try {
    const { bytes } = await readResumeFile({ fileKey: resume.fileKey, fileUrl: resume.fileUrl });
    const resumeText = await extractResumeText(bytes, resume.mimeType);
    const validation = validateResumeText(resumeText);

    if (!validation.valid) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { aiAnalysisStatus: AiAnalysisStatus.FAILED },
      });

      return NextResponse.json({ error: validation.reason }, { status: 422 });
    }

    const result = await analyzeResumeWithGroq({
      jobDescription: application.job.description,
      jobTitle: application.job.title,
      resumeText,
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        aiAnalysisStatus: AiAnalysisStatus.SUCCESS,
        aiRecommendation: result.recommendation,
        aiFitLevel: result.fit_level,
        aiMatchedRequirements: result.matched_requirements,
        aiMissingRequirements: result.missing_requirements,
        aiSkillsFound: result.skills_found,
        aiExperienceSummary: result.experience_summary,
        aiRiskPoints: result.risk_points,
        aiSummary: result.short_summary,
        matchScore: result.score,
        matchExplanation: result,
        aiAnalyzedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { aiAnalysisStatus: AiAnalysisStatus.FAILED },
    });

    console.error("AI analysis failed:", error);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
