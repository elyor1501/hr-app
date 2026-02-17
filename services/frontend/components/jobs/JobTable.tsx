import { DataTable } from "@/components/table/data-table";
import { columns_job_list } from "../jobs/JobListTableColumn";
import { getJob } from "@/lib/jobs/data";

export default async function JobTable() {
  const data = await getJob();
  return (
    <DataTable
      columns={columns_job_list}
      data={data}
      filter={"department"}
      sort={""}
    />
  );
}