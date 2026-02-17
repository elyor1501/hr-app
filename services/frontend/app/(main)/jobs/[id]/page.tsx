import JobDetails from "@/components/jobs/JobDetails";
import { Suspense } from "react";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<p>Loading candidate...</p>}>
      <JobDetails id={id} />
    </Suspense>
  );
}
