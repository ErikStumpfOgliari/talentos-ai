"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApplicationStatus,
  AutomationTrigger,
  EmailStatus,
  EmailTrigger,
  PipelineCategory,
} from "@/generated/prisma/client";
import { automationRoles, requireRole } from "@/lib/auth";
import { deliverEmailMessage, queueTemplateEmail } from "@/lib/email-automation";
import { prisma } from "@/lib/prisma";
import { limitText } from "@/lib/text-limits";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readLongString(formData: FormData, key: string) {
  return limitText(readString(formData, key));
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : null;
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

function revalidateEmailAutomation() {
  revalidatePath("/dashboard");
  revalidatePath("/email-automation");
  revalidatePath("/interviews");
  revalidatePath("/candidates");
}

export async function createEmailTemplate(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const name = readString(formData, "name");
  const subject = readString(formData, "subject");
  const body = readLongString(formData, "body");

  if (!name || !subject || !body) {
    throw new Error("Name, subject, and body are required.");
  }

  await prisma.emailTemplate.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name,
      },
    },
    update: {
      subject,
      body,
      trigger: readEnum(EmailTrigger, readString(formData, "trigger"), EmailTrigger.MANUAL),
      active: formData.get("active") === "on",
    },
    create: {
      organizationId: organization.id,
      name,
      subject,
      body,
      trigger: readEnum(EmailTrigger, readString(formData, "trigger"), EmailTrigger.MANUAL),
      active: formData.get("active") === "on",
    },
  });

  revalidateEmailAutomation();
  redirect("/email-automation?template=1");
}

export async function createAutomationRule(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const name = readString(formData, "name");
  const templateId = readString(formData, "templateId");

  if (!name || !templateId) {
    throw new Error("Name and template are required.");
  }

  await prisma.automationRule.create({
    data: {
      organizationId: organization.id,
      name,
      trigger: readEnum(AutomationTrigger, readString(formData, "trigger"), AutomationTrigger.STAGE_CHANGED),
      templateId,
      stageId: readOptionalString(formData, "stageId"),
      active: formData.get("active") === "on",
      delayMinutes: readNumber(formData, "delayMinutes") ?? 0,
    },
  });

  revalidateEmailAutomation();
  redirect("/email-automation?rule=1");
}

export async function queueManualTemplateEmail(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const applicationId = readString(formData, "applicationId");
  const templateId = readString(formData, "templateId");
  const senderId = readOptionalString(formData, "senderId") ?? session.user.id;

  if (!applicationId || !templateId) {
    throw new Error("Application and template are required.");
  }

  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: templateId,
      organizationId: organization.id,
    },
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  const message = await queueTemplateEmail({
    organizationId: organization.id,
    applicationId,
    templateId,
    senderId,
    trigger: template.trigger,
  });

  revalidateEmailAutomation();
  redirect(
    `/email-automation?${
      message?.status === EmailStatus.SENT ? "sent=1" : message?.status === EmailStatus.FAILED ? "failed=1" : "queued=1"
    }`,
  );
}

export async function rejectApplicationWithEmail(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const applicationId = readString(formData, "applicationId");
  const templateId = readString(formData, "templateId");
  const senderId = readOptionalString(formData, "senderId") ?? session.user.id;

  if (!applicationId || !templateId) {
    throw new Error("Application and rejection template are required.");
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId: organization.id,
    },
    include: {
      job: true,
    },
  });

  if (!application) {
    throw new Error("Application not found for this organization.");
  }

  const existingRejectedStage = await prisma.pipelineStage.findFirst({
    where: {
      organizationId: organization.id,
      jobId: application.jobId,
      category: PipelineCategory.REJECTED,
    },
  });

  const stageCount = await prisma.pipelineStage.count({
    where: {
      organizationId: organization.id,
      jobId: application.jobId,
    },
  });

  const rejectedStage =
    existingRejectedStage ??
    (await prisma.pipelineStage.create({
      data: {
        organizationId: organization.id,
        jobId: application.jobId,
        name: "Rejected",
        category: PipelineCategory.REJECTED,
        position: stageCount,
      },
    }));

  await prisma.application.update({
    where: {
      id: application.id,
    },
    data: {
      status: ApplicationStatus.REJECTED,
      rejectedAt: new Date(),
      stageId: rejectedStage.id,
      stageEnteredAt: new Date(),
    },
  });

  const message = await queueTemplateEmail({
    organizationId: organization.id,
    applicationId,
    templateId,
    senderId,
    trigger: EmailTrigger.REJECTION_SENT,
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      applicationId: application.id,
      action: "application.rejected",
      entityType: "application",
      entityId: application.id,
      metadata: {
        templateId,
      },
    },
  });

  revalidateEmailAutomation();
  redirect(
    `/email-automation?${
      message?.status === EmailStatus.SENT ? "rejected=sent" : message?.status === EmailStatus.FAILED ? "rejected=failed" : "rejected=queued"
    }`,
  );
}

export async function sendQueuedEmail(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const messageId = readString(formData, "messageId");

  if (!messageId) {
    throw new Error("Message id is required.");
  }

  const message = await deliverEmailMessage({
    messageId,
    organizationId: organization.id,
    senderId: session.user.id,
  });

  revalidateEmailAutomation();
  redirect(
    `/email-automation?${
      message?.status === EmailStatus.SENT ? "sent=1" : message?.status === EmailStatus.FAILED ? "failed=1" : "queued=1"
    }`,
  );
}

export async function toggleAutomationRule(formData: FormData) {
  const session = await requireRole(automationRoles);
  const organization = session.organization;
  const ruleId = readString(formData, "ruleId");
  const active = readString(formData, "active") === "true";

  if (!ruleId) {
    throw new Error("Rule id is required.");
  }

  await prisma.automationRule.updateMany({
    where: {
      id: ruleId,
      organizationId: organization.id,
    },
    data: {
      active,
    },
  });

  revalidateEmailAutomation();
  redirect("/email-automation?rule=1");
}
