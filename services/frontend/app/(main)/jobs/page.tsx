import { AddJobButton } from "@/components/jobs/AddJobButton";
import JobTable from "@/components/jobs/JobTable";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">List</h1>
        <AddJobButton/>
      </div>
      <Suspense fallback={<div className="p-4">Loading table...</div>}>
      <JobTable/>
      </Suspense>
    </div>
  );
}
