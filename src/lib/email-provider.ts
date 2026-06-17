import { Resend, type WebhookEventPayload } from "resend";
import { EmailStatus } from "@/generated/prisma/client";

type SendTransactionalEmailInput = {
  body: string;
  subject: string;
  toEmail: string;
};

type SendTransactionalEmailResult = {
  error?: string;
  provider: string;
  providerMessageId: string | null;
  status: EmailStatus;
};

type VerifyResendWebhookInput = {
  payload: string;
  signature: string | null;
  timestamp: string | null;
  webhookId: string | null;
};

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || null;
}

function getResendWebhookSecret() {
  return process.env.RESEND_WEBHOOK_SECRET?.trim() || null;
}

export function getEmailProviderStatus() {
  const apiKey = getResendApiKey();

  return {
    configured: Boolean(apiKey),
    from: process.env.EMAIL_FROM?.trim() || "Aptelys <onboarding@resend.dev>",
    provider: apiKey ? "resend" : "local-outbox",
    webhookConfigured: Boolean(getResendWebhookSecret()),
  };
}

export function verifyResendWebhook({
  payload,
  signature,
  timestamp,
  webhookId,
}: VerifyResendWebhookInput): WebhookEventPayload {
  const webhookSecret = getResendWebhookSecret();

  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_WEBHOOK_SECRET is required in production.");
    }

    return JSON.parse(payload) as WebhookEventPayload;
  }

  if (!signature || !timestamp || !webhookId) {
    throw new Error("Missing Resend webhook signature headers.");
  }

  const resend = new Resend(getResendApiKey() ?? undefined);

  return resend.webhooks.verify({
    payload,
    headers: {
      id: webhookId,
      signature,
      timestamp,
    },
    webhookSecret,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPlainTextAsHtml(value: string) {
  return escapeHtml(value)
    .split(/\r?\n/)
    .map((line) => (line.trim() ? line : "&nbsp;"))
    .join("<br />");
}

export async function sendTransactionalEmail({
  body,
  subject,
  toEmail,
}: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
  const providerStatus = getEmailProviderStatus();
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return {
      error: "RESEND_API_KEY is not configured.",
      provider: providerStatus.provider,
      providerMessageId: null,
      status: EmailStatus.QUEUED,
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: providerStatus.from,
      html: renderPlainTextAsHtml(body),
      subject,
      text: body,
      to: [toEmail],
    });

    if (error) {
      return {
        error: error.message,
        provider: providerStatus.provider,
        providerMessageId: null,
        status: EmailStatus.FAILED,
      };
    }

    return {
      provider: providerStatus.provider,
      providerMessageId: data?.id ?? null,
      status: EmailStatus.SENT,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown Resend delivery error.",
      provider: providerStatus.provider,
      providerMessageId: null,
      status: EmailStatus.FAILED,
    };
  }
}
