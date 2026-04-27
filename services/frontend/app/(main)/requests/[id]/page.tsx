import JobDetails from "@/components/jobs/JobDetails";
import RouteProtection from "@/components/routeProtection";
import { getJobById } from "@/lib/jobs/data";
import { getCandidates } from "@/lib/candidates/data";
import { getRequestById } from "@/lib/requests/data";
import RequestDetails from "@/components/requests/RequestDetails";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [reqData, candidateData] = await Promise.all([
    getRequestById(id),
    getCandidates(),
  ]);

  return (
    <div>
      <RouteProtection/>
      <RequestDetails id={id} requestData={reqData} candidateData={candidateData} />
    </div>
  );
}
