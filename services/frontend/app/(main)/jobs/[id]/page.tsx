import JobDetails from "@/components/jobs/JobDetails";
import { getJobById } from "@/lib/jobs/data";
import { getCandidates } from "@/lib/candidates/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jobData, candidateData] = await Promise.all([
    getJobById(id),
    getCandidates(),
  ]);

  return (
    <div>
      <JobDetails id={id} jobData={jobData} candidateData={candidateData} />
    </div>
  );
}
