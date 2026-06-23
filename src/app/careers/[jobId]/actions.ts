"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getPublicApplicationStatusPath,
  submitPublicJobApplication,
} from "@/lib/public-applications";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getRequestBaseUrl() {
  const headersList = await headers();
  const host = (headersList.get("x-forwarded-host") ?? headersList.get("host"))?.split(",")[0]?.trim();

  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return null;
  }

  const rawProto = headersList.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";

  return `${proto}://${host}`;
}

export async function submitCareersApplication(formData: FormData) {
  const jobId = readString(formData, "jobId");

  if (!jobId) {
    redirect("/careers?error=job_unavailable");
  }

  let result: Awaited<ReturnType<typeof submitPublicJobApplication>>;

  try {
    result = await submitPublicJobApplication({
      formData,
      jobId,
      requestBaseUrl: await getRequestBaseUrl(),
    });
  } catch (error) {
    console.error("Public application submission failed", error);
    redirect(`/careers/${jobId}?error=submit_failed`);
  }

  if (!result.ok) {
    redirect(`/careers/${jobId}?error=${result.error}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/careers");
  revalidatePath(`/careers/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/candidates");
  revalidatePath("/matching");
  revalidatePath(getPublicApplicationStatusPath(result.applicationToken));

  redirect(`${getPublicApplicationStatusPath(result.applicationToken)}?submitted=1`);
}
