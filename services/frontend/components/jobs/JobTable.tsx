import { DataTable } from "@/components/table/data-table";
// import { columns_job_list } from "../jobs/JobListTableColumn";
// import { getJob} from "@/lib/jobs/data";
import { columns_request_list } from "../requests/RequestListTableColumn";
import { getRequests } from "@/lib/requests/data";

export default async function JobTable() {
  // const data = await getJob();
  const data = await getRequests();
  return (
    <DataTable
    // columns={columns_job_list}
      columns={columns_request_list}
      data={data}
      filter={"department"}
      sort={""}
    />
  );
}