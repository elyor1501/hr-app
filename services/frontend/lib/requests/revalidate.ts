"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRequest(id?: string) {
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  if (id) {
    revalidatePath(`/requests/${id}`);
  }
}