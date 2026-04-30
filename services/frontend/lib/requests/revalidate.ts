"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRequest(id?: string) {
  revalidatePath("/requests");
  if (id) {
    revalidatePath(`/requests/${id}`);
  }
}
