import { AddJobButton } from "@/components/jobs/AddJobButton";
import { ImportJobButton } from "@/components/jobs/ImportJobButton";
import JobTable from "@/components/jobs/JobTable";
import RouteProtection from "@/components/routeProtection";


export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <RouteProtection/>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">List</h1>
        <div className="flex items-center gap-2">
          <ImportJobButton />
          <AddJobButton/>
        </div>
      </div>
      <JobTable/>
    </div>
  );
}
