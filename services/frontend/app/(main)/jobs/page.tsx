import { AddJobButton } from "@/components/jobs/AddJobButton";
import JobTable from "@/components/jobs/JobTable";


export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">List</h1>
        <div className="flex items-center gap-2">
          <AddJobButton/>
        </div>
      </div>
      <JobTable/>
    </div>
  );
}
