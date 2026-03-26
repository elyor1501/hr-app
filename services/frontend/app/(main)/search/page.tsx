import RouteProtection from "@/components/routeProtection";
import CandidateSearch from "@/components/search/CandidateSearch";

export default function CandidatesPage() {
  return (
    <div>
      <RouteProtection/>
      <h1 className="text-xl font-semibold">Candidate Search</h1>
      <CandidateSearch />
    </div>
  );
}
