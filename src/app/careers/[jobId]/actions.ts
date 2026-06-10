"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPublicApplicationStatusPath,
  submitPublicJobApplication,
} from "@/lib/public-applications";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitCareersApplication(formData: FormData) {
  const jobId = readString(formData, "jobId");

  if (!jobId) {
    redirect("/careers?error=job_unavailable");
  }

  const result = await submitPublicJobApplication({
    formData,
    jobId,
  });

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
