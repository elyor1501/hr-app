"use server";

import { revalidatePath } from "next/cache";
import { invalidateCandidatesCache } from "./data";

export async function revalidateCandidates() {
  invalidateCandidatesCache();
  revalidatePath("/candidates");
}
