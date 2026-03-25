import AddResumeButton from "@/components/resumes/AddResumeButton";

import ResumeTable from "@/components/resumes/ResumeTable";

export default async function Page() {
  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Resume List</h1>
        <AddResumeButton />
      </div>

        <ResumeTable />
    </div>
  );
}
