import { DataTable } from "@/components/table/data-table";
import { columns_request_list } from "../requests/RequestListTableColumn";
import { getRequests } from "@/lib/requests/data";

export default async function RequestTable() {
  const data = await getRequests();
  return (
    <DataTable
      columns={columns_request_list}
      data={data}
      filter={"department"}
      sort={""}
    />
  );
}