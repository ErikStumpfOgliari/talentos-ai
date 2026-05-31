"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreCandidateForJob } from "@/lib/candidate-matching";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function rankCandidatesForJob(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const jobId = readString(formData, "jobId");

  if (!jobId) {
    throw new Error("Job id is required.");
  }

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      organizationId: organization.id,
    },
    include: {
      pipelineStages: {
        orderBy: {
          position: "asc",
        },
        take: 1,
      },
    },
  });

  if (!job) {
    throw new Error("Job not found for this organization.");
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      organizationId: organization.id,
    },
    include: {
      education: true,
      experience: true,
      resumes: {
        orderBy: {
          createdAt: "desc",
        },
        take: 2,
      },
      skills: {
        include: {
          skill: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const stageId = job.pipelineStages[0]?.id;

  for (const candidate of candidates) {
    const match = await scoreCandidateForJob(job, candidate);

    await prisma.application.upsert({
      where: {
        jobId_candidateId: {
          jobId: job.id,
          candidateId: candidate.id,
        },
      },
      update: {
        stageId,
        status: "ACTIVE",
        source: candidate.source,
        matchScore: match.score,
        matchExplanation: match.explanation,
      },
      create: {
        organizationId: organization.id,
        jobId: job.id,
        candidateId: candidate.id,
        stageId,
        status: "ACTIVE",
        source: candidate.source,
        matchScore: match.score,
        matchExplanation: match.explanation,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/candidates");
  revalidatePath("/matching");

  redirect(`/matching?jobId=${job.id}&ranked=1`);
}
