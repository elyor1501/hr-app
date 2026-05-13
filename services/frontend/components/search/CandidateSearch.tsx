"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  FilterX,
  FileText,
  Loader2,
  MapPin,
  Mail,
  Eye,
  User,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";

const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead"] as const;
const AVAILABILITY_OPTIONS = [
  "Immediate",
  "2 weeks",
  "1 month",
  "3 months",
  "Not Available",
] as const;

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  current_title: string;
  skills: string[];
  location: string;
  status: string;
  similarity_score: number;
  experience_level: string;
  availability: string;
  years_of_experience?: number;
};

export default function CandidateSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSkills, setFilterSkills] = useState("");
  const [filterExperienceLevel, setFilterExperienceLevel] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");
  const [filterExpMin, setFilterExpMin] = useState<number | "">("");
  const [filterExpMax, setFilterExpMax] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<Candidate[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const apiBase = getApiUrl() || "";

  const runSemanticSearch = async () => {
    if (!query.trim()) return;
    setSemanticLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query_text: query.trim(),
          top_k: 20,
          min_score: 0.0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const mapped: Candidate[] = (data.candidates || []).map((c: any) => ({
        id: c.id,
        first_name: c.first_name ?? "",
        last_name: c.last_name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? null,
        current_title: c.current_title ?? "",
        skills: c.skills ?? [],
        location: c.location ?? "",
        status: c.candidate_status ?? "",
        similarity_score: c.score ?? 0,
        experience_level: c.experience_level ?? "",
        availability: c.availability ?? "",
        years_of_experience: c.years_of_experience,
      }));
      setResults(
        mapped.sort((a, b) => b.similarity_score - a.similarity_score),
      );
    } catch (err) {
      console.error("Semantic search error:", err);
      setResults([]);
    } finally {
      setSemanticLoading(false);
    }
  };

  const runFilterSearch = async () => {
    setFilterLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "20");
      if (filterStatus) params.set("candidateStatus", filterStatus);
      if (filterLocation) params.set("location", filterLocation);
      if (filterSkills) params.set("skills", filterSkills);
      if (filterExperienceLevel)
        params.set("experience_level", filterExperienceLevel);
      if (filterAvailability) params.set("availability", filterAvailability);
      if (filterExpMin !== "")
        params.set("experienceMin", String(filterExpMin));
      if (filterExpMax !== "")
        params.set("experienceMax", String(filterExpMax));

      const res = await fetch(
        `${apiBase}/api/v1/candidates/search?${params.toString()}`,
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const mapped: Candidate[] = (data.items || []).map((c: any) => ({
        id: c.id,
        first_name: c.first_name ?? "",
        last_name: c.last_name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? null,
        current_title: c.current_title ?? "",
        skills: c.skills ?? [],
        location: c.location ?? "",
        status: c.status ?? "",
        similarity_score: 0,
        experience_level: c.experience_level ?? "",
        availability: c.availability ?? "",
        years_of_experience: c.years_of_experience,
      }));
      setResults(mapped);
    } catch (err) {
      console.error("Filter search error:", err);
      setResults([]);
    } finally {
      setFilterLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterStatus("");
    setFilterLocation("");
    setFilterSkills("");
    setFilterExperienceLevel("");
    setFilterAvailability("");
    setFilterExpMin("");
    setFilterExpMax("");
  };

  const hasFilters =
    filterStatus ||
    filterLocation ||
    filterSkills ||
    filterExperienceLevel ||
    filterAvailability ||
    filterExpMin !== "" ||
    filterExpMax !== "";

  return (
    <div className="container mx-auto max-w-6xl space-y-5">
      <h1 className="text-xl font-semibold">Candidate Search</h1>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSemanticSearch()}
            placeholder="Search by skills, title, or keywords…"
            className="pl-10"
          />
        </div>

        <Button
          onClick={runSemanticSearch}
          disabled={semanticLoading || filterLoading || !query.trim()}
        >
          {semanticLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowFilters((p) => !p)}
          className={showFilters ? "border-blue-500 text-blue-600" : ""}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {hasFilters && (
            <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block" />
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Filter candidates
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full mt-1 border p-2 rounded text-sm bg-white"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium">Location</label>
              <Input
                placeholder="e.g. Bangalore"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Skills</label>
              <Input
                placeholder="React, Node, Python"
                value={filterSkills}
                onChange={(e) => setFilterSkills(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* <div>
              <label className="text-xs font-medium">Experience Level</label>
              <select
                value={filterExperienceLevel}
                onChange={(e) => setFilterExperienceLevel(e.target.value)}
                className="w-full mt-1 border p-2 rounded text-sm bg-white"
              >
                <option value="">All</option>
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div> */}

            {/* <div>
              <label className="text-xs font-medium">Availability</label>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="w-full mt-1 border p-2 rounded text-sm bg-white"
              >
                <option value="">All</option>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div> */}

            <div>
              <label className="text-xs font-medium">
                Min Experience (yrs)
              </label>
              <Input
                type="number"
                placeholder="0"
                min={0}
                value={filterExpMin}
                onChange={(e) =>
                  setFilterExpMin(e.target.value ? Number(e.target.value) : "")
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium">
                Max Experience (yrs)
              </label>
              <Input
                type="number"
                placeholder="20"
                min={0}
                value={filterExpMax}
                onChange={(e) =>
                  setFilterExpMax(e.target.value ? Number(e.target.value) : "")
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetFilters();
              }}
              disabled={!hasFilters}
            >
              <FilterX className="h-4 w-4 mr-1" />
              Reset
            </Button>

            <Button
              onClick={runFilterSearch}
              disabled={semanticLoading || filterLoading}
            >
              {filterLoading && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {semanticLoading || filterLoading ? (
          <p className="text-center text-muted-foreground py-12">Searching…</p>
        ) : results.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {results.length} candidate{results.length !== 1 ? "s" : ""} found
            </p>
            {results.map((profile) => (
              <Card
                key={profile.id}
                className="group border shadow-sm hover:border-blue-200 transition-all duration-300"
              >
                <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">
                          {profile.first_name} {profile.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {profile.location || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 text-sm">
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

                    <div className="flex flex-wrap gap-2">
                      {profile.experience_level && (
                        <Badge variant="secondary" className="text-xs">
                          {profile.experience_level}
                        </Badge>
                      )}
                      {profile.availability && (
                        <Badge variant="outline" className="text-xs">
                          {profile.availability}
                        </Badge>
                      )}
                      {profile.years_of_experience != null && (
                        <Badge variant="outline" className="text-xs">
                          {profile.years_of_experience} yrs exp
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-col gap-2">
                    <Button
                      variant="default"
                      onClick={() => router.push(`/candidates/${profile.id}`)}
                      className="h-8 w-8 p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {profile.similarity_score > 0 && (
                      <Badge
                        variant="outline"
                        className="h-fit mt-4 bg-blue-50 text-blue-700 border-blue-100 font-bold px-3 py-1"
                      >
                        {(profile.similarity_score * 100).toFixed(1)}% Match
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : searched ? (
          <div className="text-center py-20 border border-dashed rounded-[2rem] bg-slate-50/50">
            <FilterX className="h-12 w-12 mx-auto text-slate-200 mb-4" />
            <h3 className="font-semibold text-lg">No Results Found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
              Try adjusting your query or filters to broaden your results.
            </p>
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <div className="bg-blue-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-blue-200" />
            </div>
            <p className="text-lg font-medium">Search or filter candidates</p>
            <p className="text-sm opacity-70 mt-1">
              Use the search bar or open Filters to browse by criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
