import RouteProtection from "@/components/routeProtection";
import CandidateSearch from "@/components/search/CandidateSearch";

export default function CandidatesPage() {
  return (
    <div>
      <RouteProtection/>
      <CandidateSearch />
    </div>
  );
}
