import { getCandidates } from "@/lib/candidates/data";
import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import CandidateProcessingTracker from "./CandidateProcessingTracker";

export default async function CandidatesTable() {
  const data = await getCandidates();
  return (
    <>
      <CandidateProcessingTracker candidates={data} />
      <DataTable
        columns={columns_candidate_list}
        data={data}
        filter={"first_name"}
        sort={""}
      />
    </>
  );
}