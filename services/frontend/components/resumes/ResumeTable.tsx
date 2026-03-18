import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { getResumes } from "@/lib/resumeList/data";

export default async function ResumeTable() {
  const resumes = await getResumes();

  return (
    <DataTable
      columns={columns_resume_list}
      data={resumes}
      filter={"name"}
      sort={""}
    />
  );
}
