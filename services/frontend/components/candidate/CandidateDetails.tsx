"use client";

import { useState } from "react";
import { getCandidateById, matchJobs } from "@/lib/candidates/data";
import {
  updateCandidate,
  setPrimaryResume,
} from "@/lib/candidates/action";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle,
  Paperclip,
  EyeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteResumeButton } from "./DeleteCandiResumeButton";
import { DeleteAttachmentButton } from "./DeleteAttachmentButton";
import { UploadAttachmentDialog } from "./UploadCandiAttachment";

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
  const [uploading, setUploading] = useState(false);

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

  async function handleSetPrimary(resumeId: string) {
    setUploading(true);
    try {
      await setPrimaryResume(id, resumeId);
      const updated = await getCandidateById(id);
      setCandidate(updated);
      toast.success("Primary resume updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to set primary resume");
    } finally {
      setUploading(false);
    }
  }

  if (loading || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">
          Loading candidate profile...
        </p>
      </div>
    );
  }

  const attachmentTypes = [
    "Certification",
    "Portfolio",
    "Qualification",
    "License",
    "Cover Letter",
    "Reference Letter",
    "Other",
  ];

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="resume">Resumes</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <form
          key={isEditing ? "edit" : "view"}
          id="candidate-form"
          action={handleSubmit}
          className="mt-6"
        >
          <input type="hidden" name="id" value={candidate.id} />

          <TabsContent value="basic" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  name="full_name"
                  defaultValue={`${candidate.first_name} ${candidate.last_name}`}
                  disabled
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
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  name="email"
                  defaultValue={candidate.email ?? "NA"}
                  disabled
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  name="phone"
                  defaultValue={candidate.phone ?? "NA"}
                  disabled
                  className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <input
                  name="location"
                  defaultValue={candidate.location ?? "NA"}
                  disabled
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
                  disabled
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
                  disabled
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
                  disabled
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
                  disabled
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
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white"
                >
                  {loading ? "Updating.." : "Update"}
                </button>
              </div>
            )}

            <h2 className="text-lg font-semibold">Educational Details</h2>
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
                  <div className="text-sm text-gray-700">
                    Grade : {edu.grade}
                  </div>
                )}
              </div>
            ))}

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

          <TabsContent value="experience" className="space-y-6">
            {(candidate.experience || []).map((exp: any, index: number) => (
              <div
                key={index}
                className="border rounded-lg p-5 bg-gray-50 space-y-2"
              >
                <div className="flex justify-between text-lg font-semibold">
                  <span>{exp.job_title}</span>
                  <span>
                    ({exp.start_date} - {exp.end_date})
                  </span>
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

          <TabsContent value="resume" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Resumes
              </h3>
            </div>

            <div className="grid gap-4">
              {(candidate.cvs || []).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No resumes uploaded yet</p>
                </div>
              ) : (
                candidate.cvs.map((resume: any) => (
                  <div
                    key={resume.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      resume.is_primary
                        ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-200"
                        : "bg-white border-gray-100 hover:border-gray-200 shadow-sm",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          resume.is_primary
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {resume.file_name || "Resume"}
                          </span>
                          {resume.is_primary && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Uploaded on{" "}
                          {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!resume.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(resume.id)}
                          disabled={uploading}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Set as Primary"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}

                      <a
                        href={resume.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Resume"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </a>

                      {(candidate.cvs || []).length > 1 && (
                        <DeleteResumeButton
                          candidateId={id}
                          resumeId={resume.id}
                          onSuccess={(updated) => setCandidate(updated)}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Miscellaneous Documents
              </h3>
              <UploadAttachmentDialog
                candidateId={id}
                attachmentTypes={attachmentTypes}
                onSuccess={(updated) => setCandidate(updated)}
              />
            </div>

            <div className="grid gap-4">
              {(candidate.attachments || []).length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-gray-50">
                  <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No attachments found</p>
                </div>
              ) : (
                candidate.attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-50 text-gray-500 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {attachment.file_name || attachment.filename}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            {attachment.document_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Uploaded on{" "}
                          {new Date(attachment.created_at)
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, ".")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View Attachment"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </a>
                      <DeleteAttachmentButton
                        candidateId={id}
                        attachmentId={attachment.id}
                        onSuccess={(updated) => setCandidate(updated)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
