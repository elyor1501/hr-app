"use client";

import { useEffect, useState } from "react";
import { updateJob } from "@/lib/jobs/action";
import { getJobById } from "@/lib/jobs/data";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
};

export default function JobDetails({ id }: Props) {
  const [job, setJob] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchJob() {
      setLoading(true);
      const data = await getJobById(id);
      setJob(data);
      setLoading(false);
    }

    if (id) fetchJob();
  }, [id]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    await updateJob(formData);
    const updatedJob = await getJobById(id);
    setJob(updatedJob);

    setIsEditing(false);
    setLoading(false);

    router.refresh();
  }

  if (!job) return <p>Loading jobs...</p>;

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

          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              name="title"
              defaultValue={job.title}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
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
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
