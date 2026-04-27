import { getCandidates } from "@/lib/candidates/data";
import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { getResumes } from "@/lib/resumeList/data";
import { ResumeExtractionToast } from "./ExtractionMsg";
// import { SmartAutoRefresh } from "./Autorefresh";
import { Suspense } from "react";

async function CandidateStatusTracker() {
  const resumes = await getResumes();
  return (
    <>
      {/* <SmartAutoRefresh resumes={resumes} /> */}
      <ResumeExtractionToast resumes={resumes} />
    </>
  );
}

export default async function CandidatesTable() {
  const data = await getCandidates();

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <CandidateStatusTracker />
      </Suspense>
      
      <div className="animate-in fade-in duration-500">
        <DataTable
          columns={columns_candidate_list}
          data={data}
          filter={"first_name"}
          sort={""}
        />
      </div>
    </div>
  );
}
