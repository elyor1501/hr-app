"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import { useRouter, useSearchParams } from "next/navigation";

export interface FilterState {
  q: string;
  jobTitle: string;
  name: string;
  location: string;
  experienceLevel: string[];
  skills: string[];
  availability: string[];
}

const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead"];
const AVAILABILITY_OPTIONS = ["Immediate", "2 weeks", "1 month", "3 months", "Not Available"];

export default function CandidateFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get("q") || "",
    jobTitle: searchParams.get("jobTitle") || "",
    name: searchParams.get("name") || "",
    location: searchParams.get("location") || "",
    experienceLevel: searchParams.getAll("experienceLevel") || [],
    skills: searchParams.getAll("skills") || [],
    availability: searchParams.getAll("availability") || [],
  });

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    !!(searchParams.get("jobTitle") || searchParams.get("name") || searchParams.get("location") || searchParams.get("experienceLevel") || searchParams.get("skills") || searchParams.get("availability"))
  );
  const [skillInput, setSkillInput] = useState("");

  const handleChange = (field: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const toggleMultiSelect = (field: "experienceLevel" | "availability", value: string) => {
    setFilters(prev => {
      const current = prev[field] as string[];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.jobTitle) params.set("jobTitle", filters.jobTitle);
    if (filters.name) params.set("name", filters.name);
    if (filters.location) params.set("location", filters.location);
    filters.experienceLevel.forEach(level => params.append("experienceLevel", level));
    filters.availability.forEach(opt => params.append("availability", opt));
    filters.skills.forEach(skill => params.append("skills", skill));

    router.push(`/candidates?${params.toString()}`);
  };

  const handleClear = () => {
    setFilters({
      q: "",
      jobTitle: "",
      name: "",
      location: "",
      experienceLevel: [],
      skills: [],
      availability: [],
    });
    router.push("/candidates");
  };

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!filters.skills.includes(skillInput.trim())) {
        const newSkills = [...filters.skills, skillInput.trim()];
        handleChange("skills", newSkills);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    const newSkills = filters.skills.filter((s) => s !== skill);
    handleChange("skills", newSkills);
  };

  const activeFilterCount = Object.entries(filters).reduce((acc, [key, value]) => {
    if (key === "q") return acc;
    if (Array.isArray(value)) return acc + (value.length > 0 ? 1 : 0);
    return acc + (value ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.q}
            onChange={(e) => handleChange("q", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 h-11 bg-background shadow-sm"
          />
        </div>
        <Button 
          // onClick={handleSearch}
          className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Search
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className={`h-11 px-4 flex items-center gap-2 transition-colors ${
            activeFilterCount > 0 ? "border-primary text-primary bg-primary/5" : ""
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
          {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        { (filters.q || activeFilterCount > 0) && (
          <Button variant="ghost" onClick={handleClear} className="h-11 px-3 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isAdvancedOpen && (
        <Card className="border shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Candidate Name</Label>
                <Input
                  id="name"
                  placeholder="Exact or partial name"
                  value={filters.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="Software Engineer, Product Manager..."
                  value={filters.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, region, or country"
                  value={filters.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp">Experience Level</Label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <Badge
                      key={level}
                      variant={filters.experienceLevel.includes(level) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => toggleMultiSelect("experienceLevel", level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={filters.availability.includes(opt) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => toggleMultiSelect("availability", opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills / Technologies</Label>
                <Input
                  id="skills"
                  placeholder="Type and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={addSkill}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filters.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="pl-2 pr-1 py-0.5 flex items-center gap-1">
                      {skill}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeSkill(skill)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={handleClear}>Reset Filters</Button>
              <Button 
              // onClick={handleSearch}
              >Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
