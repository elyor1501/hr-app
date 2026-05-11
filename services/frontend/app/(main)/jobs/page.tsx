import { AddJobButton } from "@/components/jobs/AddJobButton";
import JobTable from "@/components/jobs/JobTable";
import { getJob } from "@/lib/jobs/data";
import ServerPagination from "@/components/ServerPagination";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const q = params.q as string | undefined;

  const { items, total_pages } = await getJob(page, 10, q);

  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Job List</h1>
        <div className="flex items-center gap-2">
          <AddJobButton />
        </div>
      </div>
      <JobTable data={items} />

      <ServerPagination currentPage={page} totalPages={total_pages} />
    </div>
  );
}
