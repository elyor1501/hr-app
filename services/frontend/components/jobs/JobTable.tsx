import { DataTable } from "@/components/table/data-table";
import { columns_job_list } from "./JobListTableColumn";

export default function JobTable({ data }: { data: any[] }) {
  return (
    <DataTable
      columns={columns_job_list}
      data={data}
      filter={"department"}
      sort={""}
    />
  );
}
