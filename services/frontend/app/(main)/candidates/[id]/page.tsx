import CandidateDetails from "@/components/candidate/CandidateDetails";
import { Suspense } from "react";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<p>Loading candidate...</p>}>
      <CandidateDetails id={id} />
    </Suspense>
  );
}
