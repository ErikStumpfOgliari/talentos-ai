"use server";

import { redirect } from "next/navigation";
import { bookSchedulingSlot } from "@/lib/self-scheduling";

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

  await bookSchedulingSlot({
    slotStartIso,
    token,
  });

  redirect(`/schedule/${token}?booked=1`);
}
