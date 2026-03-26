import { getCandidateById, CandidateList } from "@/lib/candidates/data";
import CompareView from "@/components/candidate/CompareView";
import RouteProtection from "@/components/routeProtection";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { ids } = await searchParams;

  const idList = ids
    ? ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4) 
    : [];

  const results = await Promise.allSettled(
    idList.map((id) => getCandidateById(id))
  );

  const candidates: CandidateList[] = results
    .filter((r): r is PromiseFulfilledResult<CandidateList> => r.status === "fulfilled")
    .map((r) => r.value);

 return (
  <div>
    <RouteProtection/>
    <CompareView candidates={candidates} />
  </div>
);
}
