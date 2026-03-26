import JobDetails from "@/components/jobs/JobDetails";
import RouteProtection from "@/components/routeProtection";


export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <RouteProtection/>
      <JobDetails id={id} />
    </div>
  );
}
