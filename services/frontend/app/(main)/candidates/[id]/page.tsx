import CandidateDetails from "@/components/candidate/CandidateDetails";
import RouteProtection from "@/components/routeProtection";
import { getCandidateById } from "@/lib/candidates/data";

export const dynamic = "force-dynamic";
export default async function Page({params,}: {params: Promise<{ id: string }>;}) 
{
  const { id } = await params;
  const empData = await getCandidateById(id);

  return (
    <div>
      <RouteProtection />
      <CandidateDetails id={id} empData={empData} />
    </div>
  );
}
