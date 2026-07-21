import { ImportJobButton } from "@/components/requests/ImportJobButton";
import RequestTable from "@/components/requests/RequestTable";
import { getRequests } from "@/lib/requests/data";
import ServerPagination from "@/components/ServerPagination";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const q = params.q as string | undefined;
  const dateFrom = params.dateFrom as string | undefined;
  const dateTo = params.dateTo as string | undefined;

  const sortBy = params.sortBy as string | undefined;
  const sortOrder = params.sortOrder as "asc" | "desc" | undefined;

  const requestNumber = params.requestNumber as string | undefined;
  const company = params.company as string | undefined;

  const data = await getRequests(
    page,
    10,
    q,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    requestNumber,
    company,
  );
  const hasNext = data.length === 10;
  const totalPages = hasNext ? page + 1 : page;

  return (
    <div>
      <RequestTable data={data} />

      <ServerPagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
