import {
  AutomationTrigger,
  EmailStatus,
  EmailTrigger,
} from "@/generated/prisma/client";
import { sendTransactionalEmail } from "@/lib/email-provider";
import { prisma } from "@/lib/prisma";

type QueueTemplateEmailInput = {
  applicationId: string;
  interviewId?: string | null;
  organizationId: string;
  sendImmediately?: boolean;
  senderId?: string | null;
  status?: EmailStatus;
  templateId: string;
  trigger: EmailTrigger;
};

type QueueAutomationEmailsInput = {
  applicationId: string;
  interviewId?: string | null;
  organizationId: string;
  stageId?: string | null;
  trigger: AutomationTrigger;
};

function formatDateTime(date?: Date | null, timezone = "America/Sao_Paulo") {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function renderTemplate(value: string, variables: Record<string, string>) {
  return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => variables[key] ?? "");
}

function emailTriggerForAutomation(trigger: AutomationTrigger) {
  if (trigger === AutomationTrigger.STAGE_CHANGED) {
    return EmailTrigger.MOVED_TO_STAGE;
  }

  if (trigger === AutomationTrigger.INTERVIEW_SCHEDULED) {
    return EmailTrigger.INTERVIEW_SCHEDULED;
  }

  if (trigger === AutomationTrigger.REJECTION_SENT) {
    return EmailTrigger.REJECTION_SENT;
  }

  if (trigger === AutomationTrigger.CANDIDATE_CREATED) {
    return EmailTrigger.APPLICATION_RECEIVED;
  }

  return EmailTrigger.MANUAL;
}

export async function queueTemplateEmail({
  applicationId,
  interviewId,
  organizationId,
  sendImmediately = true,
  senderId,
  status = EmailStatus.QUEUED,
  templateId,
  trigger,
}: QueueTemplateEmailInput) {
  const [organization, application, template, interview] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
    }),
    prisma.application.findFirst({
      where: {
        id: applicationId,
        organizationId,
      },
      include: {
        candidate: true,
        job: true,
        stage: true,
      },
    }),
    prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        organizationId,
        active: true,
      },
    }),
    interviewId
      ? prisma.interview.findFirst({
          where: {
            id: interviewId,
            organizationId,
          },
        })
      : null,
  ]);

  if (!organization || !application || !template || !application.candidate.email) {
    return null;
  }

  const variables = {
    candidateName: application.candidate.name,
    candidateEmail: application.candidate.email,
    companyName: organization.name,
    interviewTime: formatDateTime(interview?.startsAt, interview?.timezone ?? organization.timezone),
    jobTitle: application.job.title,
    meetingUrl: interview?.meetingUrl ?? "",
    matchScore: String(application.matchScore ?? 0),
    stageName: application.stage?.name ?? "Pipeline",
  };

  const message = await prisma.emailMessage.create({
    data: {
      organizationId,
      candidateId: application.candidateId,
      applicationId: application.id,
      templateId: template.id,
      senderId,
      toEmail: application.candidate.email,
      subject: renderTemplate(template.subject, variables),
      body: renderTemplate(template.body, variables),
      status,
      trigger,
      provider: "local-outbox",
      sentAt: status === EmailStatus.SENT ? new Date() : null,
    },
  });

  if (sendImmediately && status === EmailStatus.QUEUED) {
    return deliverEmailMessage({
      messageId: message.id,
      organizationId,
      senderId,
    });
  }

  return message;
}

export async function deliverEmailMessage({
  messageId,
  organizationId,
  senderId,
}: {
  messageId: string;
  organizationId: string;
  senderId?: string | null;
}) {
  const message = await prisma.emailMessage.findFirst({
    where: {
      id: messageId,
      organizationId,
    },
  });

  if (!message) {
    return null;
  }

  if (!message.toEmail) {
    return prisma.emailMessage.update({
      where: {
        id: message.id,
      },
      data: {
        provider: "local-outbox",
        status: EmailStatus.FAILED,
      },
    });
  }

  const delivery = await sendTransactionalEmail({
    body: message.body,
    subject: message.subject,
    toEmail: message.toEmail,
  });

  const updatedMessage = await prisma.emailMessage.update({
    where: {
      id: message.id,
    },
    data: {
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      senderId: senderId ?? message.senderId,
      sentAt: delivery.status === EmailStatus.SENT ? new Date() : message.sentAt,
      status: delivery.status,
    },
  });

  if (delivery.error) {
    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: senderId,
        candidateId: message.candidateId,
        applicationId: message.applicationId,
        action: delivery.status === EmailStatus.FAILED ? "email.delivery_failed" : "email.delivery_deferred",
        entityType: "email_message",
        entityId: message.id,
        metadata: {
          error: delivery.error,
          provider: delivery.provider,
        },
      },
    });
  }

  return updatedMessage;
}

export async function queueAutomationEmails({
  applicationId,
  interviewId,
  organizationId,
  stageId,
  trigger,
}: QueueAutomationEmailsInput) {
  const rules = await prisma.automationRule.findMany({
    where: {
      organizationId,
      trigger,
      active: true,
      templateId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const queuedMessages = [];

  for (const rule of rules) {
    if (rule.stageId && rule.stageId !== stageId) {
      continue;
    }

    const message = await queueTemplateEmail({
      applicationId,
      interviewId,
      organizationId,
      sendImmediately: rule.delayMinutes === 0,
      templateId: rule.templateId ?? "",
      trigger: emailTriggerForAutomation(trigger),
    });

    if (message) {
      queuedMessages.push(message);
    }
  }

  return queuedMessages;
}
