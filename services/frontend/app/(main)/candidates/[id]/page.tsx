import CandidateDetails from "@/components/candidate/CandidateDetails";
import RouteProtection from "@/components/routeProtection";


export const dynamic = "force-dynamic";
export default async function Page({params,}: {params: Promise<{ id: string }>;}) 
{
  const { id } = await params;

  return (
    <div>
      <RouteProtection/>
      <CandidateDetails id={id} />

    </div>
  );
}
