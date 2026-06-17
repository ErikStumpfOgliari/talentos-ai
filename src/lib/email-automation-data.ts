import { defaultOrganizationSlug } from "@/lib/organization";
import { getEmailProviderStatus } from "@/lib/email-provider";
import { prisma } from "@/lib/prisma";

export type EmailAutomationTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger: string;
  active: boolean;
  sentCount: number;
};

export type EmailAutomationRule = {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  delayMinutes: number;
  template: string;
  stage: string;
};

export type EmailAutomationMessage = {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  status: string;
  trigger: string;
  candidate: string;
  jobTitle: string;
  template: string;
  provider: string;
  createdAt: string;
  sentAt: string;
};

export type EmailAutomationApplication = {
  id: string;
  label: string;
  candidate: string;
  candidateEmail: string;
  jobTitle: string;
  stage: string;
  matchScore: number;
};

export type EmailAutomationStage = {
  id: string;
  label: string;
};

export type EmailAutomationSender = {
  id: string;
  name: string;
  email: string;
};

export type EmailAutomationPageData = {
  organizationName: string;
  templates: EmailAutomationTemplate[];
  rules: EmailAutomationRule[];
  messages: EmailAutomationMessage[];
  applications: EmailAutomationApplication[];
  stages: EmailAutomationStage[];
  senders: EmailAutomationSender[];
  stats: {
    templates: number;
    activeRules: number;
    failed: number;
    providerConfigured: boolean;
    providerFrom: string;
    providerName: string;
    webhookConfigured: boolean;
    queued: number;
    sent: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function getEmailAutomationPageData(organizationId?: string): Promise<EmailAutomationPageData> {
  const providerStatus = getEmailProviderStatus();
  const organization = await prisma.organization.findUnique({
    where: organizationId ? { id: organizationId } : { slug: defaultOrganizationSlug },
    include: {
      applications: {
        where: {
          status: "ACTIVE",
        },
        include: {
          candidate: true,
          job: true,
          stage: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      automationRules: {
        include: {
          stage: {
            include: {
              job: true,
            },
          },
          template: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      emailMessages: {
        where: {
          OR: [
            {
              applicationId: {
                not: null,
              },
            },
            {
              candidateId: {
                not: null,
              },
            },
            {
              templateId: {
                not: null,
              },
            },
          ],
        },
        include: {
          application: {
            include: {
              job: true,
            },
          },
          candidate: true,
          template: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 30,
      },
      emailTemplates: {
        include: {
          messages: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      memberships: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      pipelineStages: {
        include: {
          job: true,
        },
        orderBy: [
          {
            job: {
              title: "asc",
            },
          },
          {
            position: "asc",
          },
        ],
      },
    },
  });

  if (!organization) {
    return {
      organizationName: "No organization",
      templates: [],
      rules: [],
      messages: [],
      applications: [],
      stages: [],
      senders: [],
      stats: {
        templates: 0,
        activeRules: 0,
        failed: 0,
        providerConfigured: providerStatus.configured,
        providerFrom: providerStatus.from,
        providerName: providerStatus.provider,
        webhookConfigured: providerStatus.webhookConfigured,
        queued: 0,
        sent: 0,
      },
    };
  }

  const messages = organization.emailMessages.map((message) => ({
    id: message.id,
    toEmail: message.toEmail,
    subject: message.subject,
    body: message.body,
    status: formatEnum(message.status),
    trigger: formatEnum(message.trigger),
    candidate: message.candidate?.name ?? "Unknown candidate",
    jobTitle: message.application?.job.title ?? "No role",
    template: message.template?.name ?? "Custom email",
    provider: message.provider ?? "No provider",
    createdAt: formatDate(message.createdAt),
    sentAt: formatDate(message.sentAt),
  }));

  return {
    organizationName: organization.name,
    templates: organization.emailTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      trigger: formatEnum(template.trigger),
      active: template.active,
      sentCount: template.messages.length,
    })),
    rules: organization.automationRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      trigger: formatEnum(rule.trigger),
      active: rule.active,
      delayMinutes: rule.delayMinutes,
      template: rule.template?.name ?? "No template",
      stage: rule.stage ? `${rule.stage.job.title} - ${rule.stage.name}` : "Any stage",
    })),
    messages,
    applications: organization.applications
      .map((application) => ({
        id: application.id,
        label: `${application.candidate.name} - ${application.job.title}`,
        candidate: application.candidate.name,
        candidateEmail: application.candidate.email ?? "No email",
        jobTitle: application.job.title,
        stage: application.stage?.name ?? "Unassigned",
        matchScore: application.matchScore ?? 0,
      }))
      .sort((left, right) => right.matchScore - left.matchScore),
    stages: organization.pipelineStages.map((stage) => ({
      id: stage.id,
      label: `${stage.job.title} - ${stage.name}`,
    })),
    senders: organization.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
    })),
    stats: {
      templates: organization.emailTemplates.filter((template) => template.active).length,
      activeRules: organization.automationRules.filter((rule) => rule.active).length,
      failed: organization.emailMessages.filter((message) => message.status === "FAILED" || message.status === "BOUNCED").length,
      providerConfigured: providerStatus.configured,
      providerFrom: providerStatus.from,
      providerName: providerStatus.provider,
      webhookConfigured: providerStatus.webhookConfigured,
      queued: organization.emailMessages.filter((message) => message.status === "QUEUED").length,
      sent: organization.emailMessages.filter((message) => message.status === "SENT" || message.status === "DELIVERED").length,
    },
  };
}
