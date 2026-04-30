import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";

export default function ResumeTable({ resumes }: { resumes: any[] }) {
  return (
    <DataTable
      columns={columns_resume_list}
      data={resumes}
      filter={"name"}
      sort={""}
      showPagination={false}
    />
  );
}