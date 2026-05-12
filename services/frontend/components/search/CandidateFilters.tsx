"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";

export interface FilterState {
  q: string;
  name: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
  experienceMin: string;
  experienceMax: string;
  skills: string[];
  candidateStatus: string;
}

const CANDIDATE_STATUS = ["active", "inactive"];
const PROCESSING_STATUS = ["processing", "completed", "error"];

export default function CandidateFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get("q") || "",
    name: searchParams.get("name") || "",
    location: searchParams.get("location") || "",
    currentTitle: searchParams.get("currentTitle") || "",
    currentCompany: searchParams.get("currentCompany") || "",
    experienceMin: searchParams.get("experienceMin") || "",
    experienceMax: searchParams.get("experienceMax") || "",
    skills: searchParams.getAll("skills") || [],
   candidateStatus: searchParams.get("candidateStatus") || "",
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const handleChange = (field: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    if (filters.name) params.set("name", filters.name);
    if (filters.location) params.set("location", filters.location);
    if (filters.currentTitle)
      params.set("currentTitle", filters.currentTitle);
    if (filters.currentCompany)
      params.set("currentCompany", filters.currentCompany);
    if (filters.experienceMin)
      params.set("experienceMin", filters.experienceMin);
    if (filters.experienceMax)
      params.set("experienceMax", filters.experienceMax);
    if (filters.candidateStatus) {
      params.set("candidateStatus", filters.candidateStatus);
    }
    filters.skills.forEach((s) => params.append("skills", s));
    params.set("page", "1");

    // router.push(`/candidates?${params.toString()}`);
  };

  const handleClear = () => {
    setFilters({
      q: "",
      name: "",
      location: "",
      currentTitle: "",
      currentCompany: "",
      experienceMin: "",
      experienceMax: "",
      skills: [],
      candidateStatus: "",
    });
    // router.push("/candidates");
  };

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!filters.skills.includes(skillInput.trim())) {
        handleChange("skills", [...filters.skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    handleChange(
      "skills",
      filters.skills.filter((s) => s !== skill)
    );
  };

  const activeFilterCount = Object.entries(filters).reduce(
    (acc, [key, value]) => {
      if (key === "q") return acc;
      if (Array.isArray(value)) return acc + (value.length ? 1 : 0);
      return acc + (value ? 1 : 0);
    },
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skills..."
            value={filters.q}
            onChange={(e) => handleChange("q", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 h-11"
          />
        </div>

        <Button onClick={handleSearch}>Search</Button>

        <Button
          variant="outline"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2">{activeFilterCount}</Badge>
          )}
          {isAdvancedOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>

        {(filters.q || activeFilterCount > 0) && (
          <Button variant="ghost" onClick={handleClear}>
            <X />
          </Button>
        )}
      </div>

      {isAdvancedOpen && (
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div>
              <Label>Name</Label>
              <Input
                value={filters.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={filters.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>

            <div>
              <Label>Job Title</Label>
              <Input
                value={filters.currentTitle}
                onChange={(e) =>
                  handleChange("currentTitle", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Company</Label>
              <Input
                value={filters.currentCompany}
                onChange={(e) =>
                  handleChange("currentCompany", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Experience (Years)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  value={filters.experienceMin}
                  onChange={(e) =>
                    handleChange("experienceMin", e.target.value)
                  }
                />
                <Input
                  placeholder="Max"
                  value={filters.experienceMax}
                  onChange={(e) =>
                    handleChange("experienceMax", e.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <Label>Skills</Label>
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.skills.map((skill) => (
                  <Badge key={skill}>
                    {skill}
                    <X
                      className="ml-1 cursor-pointer"
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className=" flex space-x-2">
  <Label>Candidate Status</Label>

  <div className="flex gap-2">
    {["active", "inactive"].map((status) => {
      const isSelected = filters.candidateStatus === status;

      return (
        <button
          key={status}
          type="button"
          onClick={() => handleChange("candidateStatus", status)}
          className={`px-4 py-1.5 rounded-md border text-sm transition capitalize
            ${
              isSelected
                ? status === "active"
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-red-100 text-red-700 border-red-300"
                : "bg-background hover:bg-muted"
            }`}
        >
          {status}
        </button>
      );
    })}
  </div>
</div>
          </CardContent>

          <div className="flex justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={handleClear}>
              Reset
            </Button>
            <Button onClick={handleSearch}>Apply Filters</Button>
          </div>
        </Card>
      )}
    </div>
  );
}