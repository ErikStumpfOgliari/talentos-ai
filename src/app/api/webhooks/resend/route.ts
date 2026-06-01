import { NextResponse } from "next/server";
import { EmailStatus } from "@/generated/prisma/client";
import { verifyResendWebhook } from "@/lib/email-provider";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ResendEmailWebhookType = "email.bounced" | "email.delivered" | "email.failed" | "email.sent";

function statusForResendEvent(type: string) {
  if (type === "email.delivered") {
    return EmailStatus.DELIVERED;
  }

  if (type === "email.bounced") {
    return EmailStatus.BOUNCED;
  }

  if (type === "email.failed") {
    return EmailStatus.FAILED;
  }

  if (type === "email.sent") {
    return EmailStatus.SENT;
  }

  return null;
}

function parseEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function readWebhookReason(event: {
  type: string;
  data: {
    bounce?: {
      message?: string;
      subType?: string;
      type?: string;
    };
    failed?: {
      reason?: string;
    };
  };
}) {
  if (event.type === "email.bounced") {
    return event.data.bounce?.message ?? event.data.bounce?.type ?? "Email bounced.";
  }

  if (event.type === "email.failed") {
    return event.data.failed?.reason ?? "Email failed.";
  }

  return null;
}

export async function POST(request: Request) {
  const payload = await request.text();
  const webhookId = request.headers.get("svix-id");

  let event;

  try {
    event = verifyResendWebhook({
      payload,
      signature: request.headers.get("svix-signature"),
      timestamp: request.headers.get("svix-timestamp"),
      webhookId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  const status = statusForResendEvent(event.type);

  if (!status) {
    return NextResponse.json({ ignored: true, type: event.type });
  }

  const emailEvent = event as {
    created_at: string;
    data: {
      bounce?: {
        message?: string;
        subType?: string;
        type?: string;
      };
      email_id: string;
      failed?: {
        reason?: string;
      };
      subject?: string;
      to?: string[];
    };
    type: ResendEmailWebhookType;
  };
  const providerMessageId = emailEvent.data.email_id;
  const idempotencyKey = webhookId ?? `${emailEvent.type}:${providerMessageId}:${emailEvent.created_at}`;

  const existingWebhookEvent = await prisma.auditEvent.findFirst({
    where: {
      entityType: "resend_webhook",
      entityId: idempotencyKey,
    },
    select: {
      id: true,
    },
  });

  if (existingWebhookEvent) {
    return NextResponse.json({ duplicate: true, id: idempotencyKey });
  }

  const message = await prisma.emailMessage.findFirst({
    where: {
      provider: "resend",
      providerMessageId,
    },
  });

  if (!message) {
    return NextResponse.json({ ignored: true, reason: "message_not_found", providerMessageId });
  }

  const eventDate = parseEventDate(emailEvent.created_at);
  const updatedMessage = await prisma.emailMessage.update({
    where: {
      id: message.id,
    },
    data: {
      deliveredAt: status === EmailStatus.DELIVERED ? eventDate : message.deliveredAt,
      sentAt: status === EmailStatus.SENT && !message.sentAt ? eventDate : message.sentAt,
      status,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: message.organizationId,
      candidateId: message.candidateId,
      applicationId: message.applicationId,
      action: `resend.${emailEvent.type}`,
      entityType: "resend_webhook",
      entityId: idempotencyKey,
      metadata: {
        emailMessageId: message.id,
        providerMessageId,
        reason: readWebhookReason(emailEvent),
        status,
        subject: emailEvent.data.subject,
        to: emailEvent.data.to,
      },
    },
  });

  return NextResponse.json({
    id: idempotencyKey,
    messageId: updatedMessage.id,
    status: updatedMessage.status,
  });
}
