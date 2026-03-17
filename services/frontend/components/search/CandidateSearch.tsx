"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Search,
  FilterX,
  FileText,
  Loader2,
  MapPin,
  Clock,
  Mail,
  Eye,
  User,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Candidate = {
  id: string;
  resume_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_title: string;
  skills: string[];
  resume_text: string;
  resume_url: string;
  location: string;
  status: string;
  similarity_score: number;
  created_at: string;
};

export default function CandidateSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [minScore, setMinScore] = useState(0.0);

  const debouncedQuery = useDebounce(query, 500);

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query_text: trimmedQuery,
              top_k: 10,
              min_score: minScore,
            }),
          },
        );

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Search failed body:", errorBody);
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        console.log('can',data)

        const mappedResults = (data.candidates || []).map((c: any) => ({
          id: c.id,
          resume_id :c.resume_id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          current_title: c.current_title,
          skills: c.skills,
          similarity_score: c.score,
          resume_text: c.resume_text || "",
          resume_url: c.resume_url || "",
          location: c.location || "",
          status: c.status || "",
          created_at: c.created_at || "",
        }));
        

        setResults(
          mappedResults.sort((a, b) => b.similarity_score - a.similarity_score),
        );
        console.log("match",mappedResults)
      } catch (err) {
        console.error("Semantic Search Error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [minScore],
  );

  useEffect(() => {
    if (debouncedQuery) executeSearch(debouncedQuery);
    else setResults([]);
  }, [debouncedQuery, executeSearch]);

  return (
    <div className="container mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skills or keywords"
              rows={1}
              className="w-full h-10 pl-10 pr-4 py-2 text-sm bg-transparent border rounded-lg
                 focus-visible:ring-1 focus-visible:ring-blue-500
                 outline-none resize-none overflow-hidden"
            />
          </div>

          <Button
            onClick={() => executeSearch(query)}
            disabled={loading || !query.trim()}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>
      </div>

      {debouncedQuery && !loading && (
        <div className="flex justify-between items-center">
          <p className="text-sm opacity-70">
            {results.length} Potential Matches
          </p>
          <span className="text-[10px] text-muted-foreground italic">
            Ranked by Vector Similarity Score
          </span>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500">Searching...</p>
        ) : results.length > 0 ? (
          results.map((profile) => (
            <Card
              key={profile.resume_id}
              className="group border shadow-sm hover:border-blue-200 transition-all duration-300"
            >
              <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">
                          {profile.first_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {profile.location}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 text-sm font-medium">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-foreground">
                        {profile.skills?.length || 0} skills
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-foreground truncate">
                        {profile.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-foreground capitalize">
                        {profile.current_title || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 min-w-[120px]">
                  <Badge
                    variant="outline"
                    className="h-fit bg-blue-50 text-blue-700 border-blue-100 font-bold px-3 py-1"
                  >
                    {(profile.similarity_score * 100).toFixed(2)}% Match
                  </Badge>

                  <Button
                    variant="default"
                    onClick={() => router.push(`/candidates/${profile.resume_id}`)}
                    className="h-8 mt-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 mr-2" /> View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : query ? (
          <div className="text-center py-20 border border-dashed rounded-[2rem] bg-slate-50/50">
            <FilterX className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <h3 className="font-semibold text-lg">No Results Found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
              Try adjusting your query or match sensitivity to broaden your
              results.
            </p>
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <div className="bg-blue-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-blue-200" />
            </div>
            <p className="text-lg font-medium">Start your search</p>
            <p className="text-sm opacity-70">
              Paste a job description or simple keywords above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
