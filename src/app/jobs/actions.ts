"use server";

import { revalidatePath } from "next/cache";
import {
  EmploymentType,
  JobStatus,
  PipelineCategory,
  WorkMode,
} from "@/generated/prisma/client";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  return readString(formData, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

export async function createJob(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const title = readString(formData, "title");
  const description = readString(formData, "description");

  if (!title || !description) {
    throw new Error("Title and description are required to create a job.");
  }

  const status = readEnum(JobStatus, readString(formData, "status"), JobStatus.DRAFT);
  const hiringManagerId = readOptionalString(formData, "hiringManagerId");
  const salaryMin = readNumber(formData, "salaryMin");
  const salaryMax = readNumber(formData, "salaryMax");

  await prisma.job.create({
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
}
