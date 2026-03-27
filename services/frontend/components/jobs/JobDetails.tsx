"use client";

import { useEffect, useState } from "react";
import { updateJob } from "@/lib/jobs/action";
import { getJobById, matchCandidates } from "@/lib/jobs/data";
import { useRouter } from "next/navigation";
import { getCandidates } from "@/lib/candidates/data";
import { toast } from "sonner";

type Props = {
  id: string;
  jobData: any;
  candidateData: any[];
};

export default function JobDetails({ id, jobData, candidateData }: Props) {
  const [job, setJob] = useState<any>(jobData);
  const [candidates, setCandidates] = useState<any[]>(candidateData);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const router = useRouter();

  async function runCandidateMatching() {
    if (!candidates || candidates.length === 0) return;

    setMatching(true);
    try {
      const candidateIds = candidates.map((c: any) => c.resume_id);
      const matchData = await matchCandidates(id, candidateIds);

      const topMatches = matchData.results
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 10);

      setMatches(topMatches);
    } catch (error) {
      console.error("Matching error:", error);
    }
    setMatching(false);
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    try {
      await updateJob(formData);

      const updatedJob = await getJobById(id);
      setJob(updatedJob);

      setIsEditing(false);

      toast.success("Job updated successfully"); 
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.message || "Failed to update job");
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  if (!job) return <p>Loading jobs details...</p>;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
      <form
        key={isEditing ? "edit" : "view"}
        id="job-form"
        action={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-1 gap-10"
      >
        <input type="hidden" name="id" value={job.id} />

        <div className="space-y-6">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold">Job Details</h2>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Job Title
              </label>
              <input
                name="title"
                defaultValue={job.title}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                name="status"
                defaultValue={job.status ?? "Open"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Department
              </label>
              <input
                name="department"
                defaultValue={job.department ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Employment Type
              </label>
              <select
                name="employment_type"
                defaultValue={job.employment_type ?? "Full Time"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="Full Time">Full-time</option>
                <option value="Part Time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Work Mode
              </label>
              <select
                name="work_mode"
                defaultValue={job.work_mode ?? "Onsite"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                name="location"
                defaultValue={job.location ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Hiring Manager
              </label>
              <input
                name="hiring_manager"
                defaultValue={job.hiring_manager ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Openings</label>
              <input
                type="number"
                name="openings"
                defaultValue={job.openings ?? 1}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Experience Required
              </label>
              <input
                type="number"
                name="experience_required"
                defaultValue={job.experience_required ?? 0}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Salary Range
              </label>
              <input
                name="salary_range"
                defaultValue={job.salary_range ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Education</label>
            <input
              name="education"
              defaultValue={job.education?.join(", ") ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              placeholder="B.Tech, MBA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              defaultValue={job.description ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Responsibilities
            </label>
            <textarea
              name="responsibilities"
              rows={4}
              defaultValue={job.responsibilities ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Required Skills
              </label>
              <textarea
                name="required_skills"
                rows={3}
                defaultValue={job.required_skills ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Preferred Skills
              </label>
              <textarea
                name="preferred_skills"
                rows={3}
                defaultValue={job.preferred_skills ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Application Posted
                </label>
                <input
                  type="date"
                  name="application_posted"
                  defaultValue={job.application_posted ?? ""}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Application Deadline
                </label>
                <input
                  type="date"
                  name="application_deadline"
                  defaultValue={job.application_deadline ?? ""}
                  disabled={!isEditing}
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

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
            form="job-form"
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      )}

      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Matching Candidates ({matches.length})
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              runCandidateMatching();
            }}
            disabled={matching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {matching ? "Matching..." : "Find Matching Candidates"}
          </button>
        </div>

        {matching ? (
          <p className="text-gray-500">Finding matching candidates...</p>
        ) : matches.length === 0 ? (
          <p className="text-gray-500">No matching candidates found. Click the button above to run the matching process.</p>
        ) : (
          <div className="grid gap-4">
            {matches.map((candidate) => (
              <div
                key={candidate.candidate_id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    {candidate.candidate_name || "Candidate"}
                  </h3>

                  <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {Number(candidate.match_score).toFixed(2)}%
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-bold">Reasoning: </span>{candidate.reasoning}
                </p>

                {candidate.strengths?.length > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-bold">
                      Strengths:
                    </span>{" "}
                    {candidate.strengths.join(", ")}
                  </div>
                )}

                {candidate.gaps?.length > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-bold">Gaps:</span>{" "}
                    {candidate.gaps.join(", ")}
                  </div>
                )}

                {candidate.recommendations?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-bold">
                      Recommendations:
                    </span>{" "}
                    {candidate.recommendations.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
