"use server";

import { revalidatePath } from "next/cache";

export async function revalidateRequest() {
  revalidatePath("/requests");
}
