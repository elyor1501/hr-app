import { DataTable } from "@/components/table/data-table";
import { columns_request_list } from "../requests/RequestListTableColumn";

export default function RequestTable({ data }: { data: any[] }) {
  return (
    <DataTable
      columns={columns_request_list}
      data={data}
      filter={"department"}
      sort={""}
      showPagination={false}
    />
  );
}