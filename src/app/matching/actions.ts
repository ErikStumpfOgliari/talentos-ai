"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { assertFeature } from "@/lib/billing-guard";
import { prisma } from "@/lib/prisma";
import { scoreCandidateForJob } from "@/lib/candidate-matching";
import { getBillingState } from "@/lib/subscription";
import { ApplicationStatus } from "@/generated/prisma/client";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function rankCandidatesForJob(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;

  // "Matching com IA" é recurso do plano Intermediário+. Bloqueia no Básico.
  const billing = await getBillingState(organization.id);
  assertFeature(billing, "aiMatching", "O Matching com IA está disponível a partir do plano Intermediário. Faça upgrade em Cobrança.");

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

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath("/candidates");
  revalidatePath("/matching");

  redirect(`/matching?jobId=${job.id}&ranked=1`);
}

export async function applyToJobFromMatching(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const jobId = readString(formData, "jobId");

  if (!candidateId || !jobId) {
    throw new Error("Candidate and job are required.");
  }

  const [job, candidate] = await Promise.all([
    prisma.job.findFirst({
      where: { id: jobId, organizationId: organization.id },
      include: {
        pipelineStages: { orderBy: { position: "asc" }, take: 1 },
      },
    }),
    prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: organization.id },
      include: {
        education: true,
        experience: true,
        resumes: { orderBy: { createdAt: "desc" }, take: 2 },
        skills: { include: { skill: true }, orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  if (!job || !candidate) {
    throw new Error("Job or candidate not found for this organization.");
  }

  const match = await scoreCandidateForJob(job, candidate);
  const stageId = job.pipelineStages[0]?.id;

  await prisma.application.upsert({
    where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
    update: {
      stageId,
      status: ApplicationStatus.ACTIVE,
      source: candidate.source,
      matchScore: match.score,
      matchExplanation: match.explanation,
    },
    create: {
      organizationId: organization.id,
      jobId: job.id,
      candidateId: candidate.id,
      stageId,
      status: ApplicationStatus.ACTIVE,
      source: candidate.source,
      matchScore: match.score,
      matchExplanation: match.explanation,
    },
  });

  revalidatePath("/matching");
  revalidatePath("/applications");
  revalidatePath("/candidates");

  redirect(`/matching?jobId=${job.id}&applied=${candidate.id}`);
}
