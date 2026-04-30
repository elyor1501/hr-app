import AddResumeButton from "@/components/resumes/AddResumeButton";
import ResumeTable from "@/components/resumes/ResumeTable";
import { getResumes } from "@/lib/resumeList/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const resumes = await getResumes();
  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Resume List</h1>
        <AddResumeButton />
      </div>

      <ResumeTable resumes={resumes} />
    </div>
  );
}