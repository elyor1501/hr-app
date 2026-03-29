"use server";

import { revalidatePath } from "next/cache";
import { invalidateResumeCache } from "./data";

export async function revalidateResumes() {
  invalidateResumeCache();
  revalidatePath("/resumeList");
}
