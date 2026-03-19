import CandidateDetails from "@/components/candidate/CandidateDetails";


export const dynamic = "force-dynamic";
export default async function Page({params,}: {params: Promise<{ id: string }>;}) 
{
  const { id } = await params;

  return (
      <CandidateDetails id={id} />
  );
}
