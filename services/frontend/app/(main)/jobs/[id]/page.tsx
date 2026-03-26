import JobDetails from "@/components/jobs/JobDetails";
import RouteProtection from "@/components/routeProtection";
import { getJobById } from "@/lib/jobs/data";
import { getCandidates } from "@/lib/candidates/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobData = await getJobById(id);
  const candidateData = await getCandidates();

  return (
    <div>
      <RouteProtection/>
      <JobDetails id={id} jobData={jobData} candidateData={candidateData} />
    </div>
  );
}
