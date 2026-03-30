"use client";

import { useState } from "react";
import { getCandidateById, matchJobs } from "@/lib/candidates/data";
import { updateCandidate } from "@/lib/candidates/action";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type Props = {
  id: string;
  empData: any;
};

export default function CandidateDetails({ id, empData }: Props) {
  const [candidate, setCandidate] = useState<any>(
    empData?.status === "processing" ? null : empData,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const router = useRouter();

  async function runJobMatching(candidateData: any) {
    setMatching(true);

    try {
      const matchData = await matchJobs(candidateData.resume_id);

      const topMatches = (matchData.results || [])
        .map((item: any) => ({
          ...item,
          match_score: Number(item.match_score) || 0,
        }))
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 5);

      setMatches(topMatches);
    } catch (error) {
      console.error("Matching error:", error);
    }

    setMatching(false);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    try {
      await updateCandidate(formData);

      const updatedCandidate = await getCandidateById(id);
      setCandidate(updatedCandidate);

      setIsEditing(false);

      toast.success("Candidate updated successfully");
    } catch (error: any) {
      console.error("Update failed:", error);
      toast.error(error?.message || "Failed to update candidate");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  // if (loading) return <p>Loading candidate details...</p>;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Candidate Details</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Edit
          </button>
        )}
      </div>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
        </TabsList>

        <form
          key={isEditing ? "edit" : "view"}
          id="candidate-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSubmit(formData);
          }}
          className="mt-6"
        >
          <input type="hidden" name="id" value={candidate.id} />

          <TabsContent value="basic" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  name="first_name"
                  defaultValue={`${candidate.first_name}`}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="candidate_status"
                  defaultValue={candidate.candidate_status ?? "active"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  name="last_name"
                  defaultValue={`${candidate.last_name}`}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  name="email"
                  defaultValue={candidate.email ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <input
                  name="location"
                  defaultValue={candidate.location ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  name="phone"
                  defaultValue={candidate.phone ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Github Link
                </label>
                <input
                  name="github"
                  defaultValue={candidate.github ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Linkdin Url
                </label>
                <input
                  name="linkedin_url"
                  defaultValue={candidate.linkedin_url ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Portfolio link
                </label>
                <input
                  name="portfolio"
                  defaultValue={candidate.portfolio ?? "NA"}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <div>
                <label className="block text-sm font-medium mb-1">Skills</label>
                <textarea
                  name="skills"
                  defaultValue={(candidate.skills || []).join(", ")}
                  disabled={!isEditing}
                  rows={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end mt-8 gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>

                <button
                  form="candidate-form"
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating.." : "Update"}
                </button>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Matching Jobs ({matches.length})
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    runJobMatching(candidate);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {matching ? "Matching..." : "Find Matching Jobs"}
                </button>
              </div>

              {matching ? (
                <p className="text-gray-500">Finding matching jobs...</p>
              ) : matches.length === 0 ? (
                <p className="text-gray-500">
                  No matching jobs found. Click the button above to run the
                  matching process.
                </p>
              ) : (
                <div className="grid gap-4">
                  {matches.map((job) => (
                    <div
                      key={job.job_id}
                      className="border rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">
                          {job.job_title || "Job"}
                        </h3>

                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                          {Number(job.match_score).toFixed(2)}%
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-bold">Reasoning:</span>{" "}
                        {job.reasoning}
                      </p>

                      {job.strengths?.length > 0 && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-bold">Strengths:</span>{" "}
                          {job.strengths.join(", ")}
                        </div>
                      )}

                      {job.gaps?.length > 0 && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-bold">Gaps:</span>
                          {job.gaps.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            {(candidate.education || []).map((edu: any, index: number) => (
              <div
                key={index}
                className="border rounded-lg p-5 bg-gray-50 space-y-2"
              >
                <div className="font-semibold flex justify-between items-center">
                  {edu.degree}
                  {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}

                  {(edu.start_date || edu.end_date) && (
                    <span>
                      {edu.start_date && edu.end_date
                        ? `${edu.start_date} - ${edu.end_date}`
                        : edu.start_date
                          ? edu.start_date
                          : edu.end_date}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-sm text-gray-700">
                    {edu.institution}
                  </span>
                </div>

                {edu.grade && (
                  <div className="text-sm text-gray-700">{edu.grade}</div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="experience" className="space-y-6">
            {(candidate.experience || []).map((exp: any, index: number) => (
              <div
                key={index}
                className="border rounded-lg p-5 bg-gray-50 space-y-2"
              >
                <div className="text-lg font-semibold">
                  {exp.job_title} ({exp.start_date} - {exp.end_date})
                </div>

                <div className="text-sm text-gray-600">
                  {exp.company} {exp.location ? `- ${exp.location}` : ""}
                </div>

                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {exp.responsibilities.map((resp: string, i: number) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
