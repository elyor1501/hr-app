import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { ResumeExtractionToast } from "./ExtractionMsg";
// import { SmartAutoRefresh } from "./Autorefresh";

function CandidateStatusTracker({ resumes }: { resumes: any[] }) {
  return (
    <>
      {/* <SmartAutoRefresh resumes={resumes} /> */}
      <ResumeExtractionToast resumes={resumes} />
    </>
  );
}

export default function CandidatesTable({ data, resumes }: { data: any[], resumes: any[] }) {
  return (
    <div className="space-y-4">
      <CandidateStatusTracker resumes={resumes} />

      <div className="animate-in fade-in duration-500">
        <DataTable
          columns={columns_candidate_list}
          data={data}
          filter={"first_name"}
          sort={""}
          showPagination={false}
          showSearch={false}
          showColumns={false}
        />
      </div>
    </div>
  );
}