import { AddCandidateButton } from "@/components/candidate/AddCandidateButton";
import CandidatesTable from "@/components/candidate/CandidateTable";
import { CompareBar } from "@/components/candidate/CompareBar";


export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <div className="pb-20">
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Candidate List</h1>
        {/* <AddCandidateButton /> */}
      </div>
        <CandidatesTable />
      <CompareBar />
    </div>
  );
}
