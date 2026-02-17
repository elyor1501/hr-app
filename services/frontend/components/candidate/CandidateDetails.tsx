"use client";

import { useEffect, useState } from "react";
import { getCandidateById } from "@/lib/candidates/data";
import { updateCandidate } from "@/lib/candidates/action";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
};

export default function CandidateDetails({ id }: Props) {
  const [candidate, setCandidate] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchCandidate() {
      setLoading(true);
      const data = await getCandidateById(id);
      setCandidate(data);
      setLoading(false);
    }

    if (id) fetchCandidate();
  }, [id]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    await updateCandidate(formData);
    const updatedCandidate = await getCandidateById(id);
    setCandidate(updatedCandidate);

    setIsEditing(false);
    setLoading(false);

    router.refresh();
  }

  if (!candidate) return <p>Loading candidate...</p>;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
      <form
        key={isEditing ? "edit" : "view"}
        id="candidate-form"
        action={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-1 gap-10"
      >
        <input type="hidden" name="id" value={candidate.id} />

        <div className="space-y-6">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold">Basic Information</h2>
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
                First Name
              </label>
              <input
                name="first_name"
                defaultValue={candidate.first_name}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                name="last_name"
                defaultValue={candidate.last_name}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={candidate.email ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                name="phone"
                defaultValue={candidate.phone ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input
                name="current_company"
                defaultValue={candidate.current_company ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                name="location"
                defaultValue={candidate.location ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Designation
              </label>
              <input
                name="current_title"
                defaultValue={candidate.current_title ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Years of Experience
              </label>
              <input
                name="years_of_experience"
                type="number"
                defaultValue={candidate.years_of_experience ?? 0}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                name="status"
                defaultValue={candidate.status ?? "Active"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Resume</label>
              <p className="mt-2 text-sm text-gray-500">
                <a
                  href={candidate.resume}
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  Resume
                </a>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Skills</label>
            <textarea
              name="skills"
              rows={4}
              defaultValue={candidate.skills ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              LinkedIn URL
            </label>
            <input
              name="linkedin_url"
              defaultValue={candidate.linkedin_url ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
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
            form="candidate-form"
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
