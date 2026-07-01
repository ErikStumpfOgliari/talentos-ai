import { NextRequest, NextResponse } from "next/server";
import { AiAnalysisStatus } from "@/generated/prisma/client";
import { getCurrentSession, recruitingRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeResumeWithGroq } from "@/lib/resume-ai-analyzer";
import { extractResumeText, validateResumeText } from "@/lib/resume-text-extractor";
import { readResumeFile } from "@/lib/resume-storage";

function buildCandidateProfileText(candidate: {
  name: string;
  currentTitle: string | null;
  location: string | null;
  yearsExperience: number | null;
  summary: string | null;
  skills: { skill: { name: string } }[];
  experience: { title: string; company: string; description: string | null }[];
  education: { degree: string | null; field: string | null; institution: string }[];
}): string {
  const lines: string[] = [];

  lines.push(`Candidate: ${candidate.name}`);
  if (candidate.currentTitle) lines.push(`Title: ${candidate.currentTitle}`);
  if (candidate.location) lines.push(`Location: ${candidate.location}`);
  if (candidate.yearsExperience) lines.push(`Experience: ${candidate.yearsExperience} years`);

  if (candidate.summary) {
    lines.push("", "Summary:", candidate.summary);
  }

  if (candidate.skills.length > 0) {
    lines.push("", `Skills: ${candidate.skills.map((s) => s.skill.name).join(", ")}`);
  }

  if (candidate.experience.length > 0) {
    lines.push("", "Experience:");
    for (const exp of candidate.experience) {
      lines.push(`- ${exp.title} at ${exp.company}`);
      if (exp.description) lines.push(`  ${exp.description}`);
    }
  }

  if (candidate.education.length > 0) {
    lines.push("", "Education:");
    for (const edu of candidate.education) {
      const label = [edu.degree, edu.field, edu.institution].filter(Boolean).join(", ");
      lines.push(`- ${label}`);
    }
  }

  return lines.join("\n");
}

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
          education: true,
          experience: true,
          resumes: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          skills: {
            include: { skill: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      job: true,
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { aiAnalysisStatus: AiAnalysisStatus.PROCESSING },
  });

  let stage = "init";

  try {
    const resume = application.candidate.resumes[0];
    let resumeText = "";
    let textSource = "pdf";

    // Try to extract text from the resume file
    if (resume?.fileKey && resume.mimeType) {
      stage = "read_file";
      const { bytes } = await readResumeFile({ fileKey: resume.fileKey, fileUrl: resume.fileUrl });

      stage = "extract_text";
      resumeText = await extractResumeText(bytes, resume.mimeType, resume.fileName);
    }

    // Fall back to stored rawText
    if (!validateResumeText(resumeText).valid && resume?.rawText) {
      resumeText = resume.rawText;
      textSource = "raw_text";
    }

    // Fall back to candidate's structured profile
    if (!validateResumeText(resumeText).valid) {
      resumeText = buildCandidateProfileText(application.candidate);
      textSource = "profile";
    }

    stage = "validate_text";
    const validation = validateResumeText(resumeText);

    if (!validation.valid) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { aiAnalysisStatus: AiAnalysisStatus.FAILED },
      });

      return NextResponse.json({ error: validation.reason }, { status: 422 });
    }

    stage = "groq_analyze";
    const result = await analyzeResumeWithGroq({
      jobDescription: application.job.description,
      jobTitle: application.job.title,
      resumeText,
    });

    stage = "save_result";
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
        matchExplanation: { ...result, textSource },
        aiAnalyzedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { aiAnalysisStatus: AiAnalysisStatus.FAILED },
    }).catch(() => null);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`AI analysis failed at stage [${stage}]: ${message}`, error);
    return NextResponse.json({ error: `Analysis failed at ${stage}: ${message}` }, { status: 500 });
  }
}
