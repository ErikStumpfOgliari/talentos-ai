"use server";

import { redirect } from "next/navigation";
import { bookSchedulingSlot } from "@/lib/self-scheduling";
import { prisma } from "@/lib/prisma";
import {
  checkSecurityRateLimit,
  isSecurityRateLimitError,
} from "@/lib/security-rate-limit";

const PUBLIC_SCHEDULING_BOOK_LIMIT_PER_HOUR = 12;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function bookSelfSchedulingSlot(formData: FormData) {
  const token = readString(formData, "token");
  const slotStartIso = readString(formData, "slotStartIso");

  if (!token || !slotStartIso) {
    throw new Error("A scheduling link and selected time are required.");
  }

  const schedulingLink = await prisma.schedulingLink.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  try {
    await checkSecurityRateLimit({
      action: "public_scheduling.book",
      identityParts: [token],
      limit: PUBLIC_SCHEDULING_BOOK_LIMIT_PER_HOUR,
      metadata: {
        schedulingLinkFound: Boolean(schedulingLink),
        schedulingLinkId: schedulingLink?.id ?? "unknown",
      },
      organizationId: schedulingLink?.organizationId,
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (isSecurityRateLimitError(error)) {
      redirect(`/schedule/${encodeURIComponent(token)}?error=rate_limited`);
    }

    throw error;
  }

  await bookSchedulingSlot({
    slotStartIso,
    token,
  });

  redirect(`/schedule/${token}?booked=1`);
}
