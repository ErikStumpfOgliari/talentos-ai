"use server";

import { revalidatePath } from "next/cache";
import {
  EmploymentType,
  JobStatus,
  PipelineCategory,
  WorkMode,
} from "@/generated/prisma/client";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { PlanLimitError } from "@/lib/billing-guard";
import { prisma } from "@/lib/prisma";
import { canAddActiveJob, getBillingState } from "@/lib/subscription";
import { limitText } from "@/lib/text-limits";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : null;
}

function readLines(formData: FormData, key: string) {
  return limitText(readString(formData, key))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readLongString(formData: FormData, key: string) {
  return limitText(readString(formData, key));
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

export async function createJob(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const title = readString(formData, "title");
  const description = readLongString(formData, "description");

  if (!title || !description) {
    throw new Error("Title and description are required to create a job.");
  }

  const status = readEnum(JobStatus, readString(formData, "status"), JobStatus.DRAFT);
  const hiringManagerId = readOptionalString(formData, "hiringManagerId");
  const salaryMin = readNumber(formData, "salaryMin");
  const salaryMax = readNumber(formData, "salaryMax");

  // Trava real de plano: bloqueia se o trial venceu ou se estourou o limite de vagas ativas.
  const billing = await getBillingState(organization.id);

  if (!billing.hasAccess) {
    throw new PlanLimitError(
      "Seu teste grátis terminou. Escolha um plano em Cobrança para publicar vagas.",
      "billing_blocked",
    );
  }

  if (status === JobStatus.ACTIVE) {
    const activeJobs = await prisma.job.count({
      where: { organizationId: organization.id, status: JobStatus.ACTIVE },
    });
    const check = canAddActiveJob(billing, activeJobs);

    if (!check.allowed) {
      throw new PlanLimitError(
        `Seu plano permite até ${check.limit} vagas ativas. Faça upgrade em Cobrança para publicar mais.`,
        "job_limit",
      );
    }
  }

  const job = await prisma.job.create({
    data: {
      organizationId: organization.id,
      createdById: session.user.id,
      title,
      department: readOptionalString(formData, "department"),
      location: readOptionalString(formData, "location"),
      workMode: readEnum(WorkMode, readString(formData, "workMode"), WorkMode.REMOTE),
      employmentType: readEnum(EmploymentType, readString(formData, "employmentType"), EmploymentType.FULL_TIME),
      status,
      openings: readNumber(formData, "openings") ?? 1,
      currency: readOptionalString(formData, "currency") ?? "USD",
      salaryMin,
      salaryMax,
      description,
      requirements: readLines(formData, "requirements"),
      responsibilities: readLines(formData, "responsibilities"),
      hiringManagerId,
      publishedAt: status === JobStatus.ACTIVE ? new Date() : null,
      pipelineStages: {
        create: [
          { organizationId: organization.id, name: "Applied", category: PipelineCategory.APPLIED, position: 0 },
          { organizationId: organization.id, name: "Screening", category: PipelineCategory.SCREENING, position: 1 },
          { organizationId: organization.id, name: "Interview", category: PipelineCategory.INTERVIEW, position: 2 },
          { organizationId: organization.id, name: "Offer", category: PipelineCategory.OFFER, position: 3 },
        ],
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath("/careers");
  revalidatePath(`/careers/${job.id}`);
}

export async function updateJobStatus(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const jobId = readString(formData, "jobId");
  const status = readEnum(JobStatus, readString(formData, "status"), JobStatus.DRAFT);

  if (!jobId) {
    throw new Error("Job id is required.");
  }

  await prisma.job.updateMany({
    where: {
      id: jobId,
      organizationId: organization.id,
    },
    data: {
      status,
      publishedAt: status === JobStatus.ACTIVE ? new Date() : undefined,
      closedAt: status === JobStatus.CLOSED || status === JobStatus.ARCHIVED ? new Date() : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${jobId}`);
}

export async function archiveJob(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const jobId = readString(formData, "jobId");

  if (!jobId) {
    throw new Error("Job id is required.");
  }

  await prisma.job.updateMany({
    where: {
      id: jobId,
      organizationId: organization.id,
    },
    data: {
      status: JobStatus.ARCHIVED,
      closedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/careers");
  revalidatePath(`/careers/${jobId}`);
}
