import { AddJobButton } from "@/components/jobs/AddJobButton";
import JobTable from "@/components/jobs/JobTable";
import { ImportJobButton } from "@/components/requests/ImportJobButton";
import RequestTable from "@/components/requests/RequestTable";
import { getRequests } from "@/lib/requests/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getRequests();
  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">List</h1>
        <div className="flex items-center gap-2">
          <ImportJobButton />
        </div>
      </div>
      <RequestTable data={data}/>
    </div>
  );
}
