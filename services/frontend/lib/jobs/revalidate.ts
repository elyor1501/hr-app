"use server";

import { revalidatePath } from "next/cache";
import { invalidateJobCache } from "./data";

export async function revalidateJobs() {
  invalidateJobCache();
  revalidatePath("/jobs");
}
