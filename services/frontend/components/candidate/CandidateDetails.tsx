"use client";

import { useState } from "react";
import { getCandidateById, matchJobs } from "@/lib/candidates/data";
import { updateCandidate, setPrimaryResume } from "@/lib/candidates/action";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, CheckCircle, Paperclip, EyeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteResumeButton } from "./DeleteCandiResumeButton";
import { DeleteAttachmentButton } from "./DeleteAttachmentButton";
import { UploadAttachmentDialog } from "./UploadCandiAttachment";
import {   Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue, } from "../ui/select";
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
      const matchData = await matchJobs(candidateData.id);

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
        <p className="text-muted-foreground font-medium">
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

  const fieldClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-6xl mx-auto bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold">Candidate Details</h2>
      
      </div>
      <Tabs defaultValue="basic" className="w-full">
  <div className="overflow-x-auto pb-2 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
    <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 min-w-max sm:min-w-0 gap-1">
      <TabsTrigger value="basic" className="text-xs sm:text-sm px-3 sm:px-4">Basic Info</TabsTrigger>
      <TabsTrigger value="experience" className="text-xs sm:text-sm px-3 sm:px-4">Experience</TabsTrigger>
      <TabsTrigger value="resume" className="text-xs sm:text-sm px-3 sm:px-4">Resumes</TabsTrigger>
      <TabsTrigger value="attachments" className="text-xs sm:text-sm px-3 sm:px-4">Attachments</TabsTrigger>
    </TabsList>
        </div>

        <form
          key={isEditing ? "edit" : "view"}
          id="candidate-form"
          action={handleSubmit}
          className="mt-4 sm:mt-6"
        >
    
          <input type="hidden" name="id" value={candidate.id} />
          <TabsContent value="basic" className="space-y-4 sm:space-y-6">
                 <div className="flex justify-end">
  {!isEditing ? (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors w-full sm:w-auto"
    >
      Update Status
    </button>
  ) : (
    <div className="flex gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors flex-1 sm:flex-none"
      >
        Cancel
      </button>
      <button
        form="candidate-form"
        type="submit"
        disabled={loading}
        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex-1 sm:flex-none"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </div>
  )}
</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Name
                </label>
                <input
                  name="full_name"
                  defaultValue={`${candidate.first_name} ${candidate.last_name}`}
                  disabled
                  className={fieldClass}
                />
              </div>
            <div>
  <label className="block text-sm font-medium mb-1 text-foreground">
    Status
  </label>
  {isEditing ? (
    <Select
      name="status"
      value={candidate?.status ?? "active"}
      onValueChange={(value) =>
        setCandidate((prev: any) => ({
          ...prev,
          status: value,
        }))
      }
    >
      <SelectTrigger className={fieldClass}>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Candidate Status</SelectLabel>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ) : (
    <input
      name="status"
      value={candidate?.status === "active" ? "Active" : "Inactive"}
      disabled
      className={fieldClass}
    />
  )}
</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Email
                </label>
                <input
                  name="email"
                  defaultValue={candidate.email ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Phone
                </label>
                <input
                  name="phone"
                  defaultValue={candidate.phone ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Location
                </label>
                <input
                  name="location"
                  defaultValue={candidate.location ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Github Link
                </label>
                <input
                  name="github"
                  defaultValue={candidate.github ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  LinkedIn URL
                </label>
                <input
                  name="linkedin_url"
                  defaultValue={candidate.linkedin_url ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Portfolio link
                </label>
                <input
                  name="portfolio"
                  defaultValue={candidate.portfolio ?? "NA"}
                  disabled
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Skills
                </label>
                <textarea
                  name="skills"
                  defaultValue={(candidate.skills || []).join(", ")}
                  disabled
                  rows={6}
                  className={fieldClass}
                />
              </div>
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Educational Details
            </h2>
            {(candidate.education || []).map((edu: any, index: number) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2"
              >
                <div className="font-semibold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-foreground">
                  <span>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ""}</span>
                  {(edu.start_date || edu.end_date) && (
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {edu.start_date && edu.end_date
                        ? `${edu.start_date} - ${edu.end_date}`
                        : edu.start_date
                          ? edu.start_date
                          : edu.end_date}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {edu.institution}
                  </span>
                </div>

                {edu.grade && (
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Grade : {edu.grade}
                  </div>
                )}
              </div>
            ))}

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  Matching Requests ({matches.length})
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    runJobMatching(candidate);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors w-full sm:w-auto"
                >
                  {matching ? "Matching..." : "Find Matching Requests"}
                </button>
              </div>

              {matching ? (
                <p className="text-muted-foreground text-sm">
                  Finding matching requests...
                </p>
              ) : matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No matching request found. Click the button above to run the
                  matching process.
                </p>
              ) : (
                <div className="grid gap-4">
                  {matches.map((job) => (
                    <div
                      key={job.job_id}
                      className="border border-border rounded-lg p-4 shadow-sm bg-card"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {job.job_title || "Request"}
                        </h3>

                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs sm:text-sm">
                          {Number(job.match_score).toFixed(2)}%
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        <span className="font-bold text-foreground">
                          Reasoning:
                        </span>{" "}
                        {job.reasoning}
                      </p>

                      {job.strengths?.length > 0 && (
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          <span className="font-bold text-foreground">
                            Strengths:
                          </span>{" "}
                          {job.strengths.join(", ")}
                        </div>
                      )}

                      {job.gaps?.length > 0 && (
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          <span className="font-bold text-foreground">
                            Gaps:
                          </span>{" "}
                          {job.gaps.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="experience" className="space-y-4 sm:space-y-6">
            {(candidate.experience || []).map((exp: any, index: number) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-2 text-base sm:text-lg font-semibold text-foreground">
                  <span>{exp.job_title}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {(exp.start_date || exp.end_date) && (
                      <span>
                        {exp.start_date && exp.end_date
                          ? `${exp.start_date} - ${exp.end_date}`
                          : exp.start_date
                            ? exp.start_date
                            : exp.end_date}
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground">
                  {exp.company} {exp.location ? `- ${exp.location}` : ""}
                </div>

                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1">
                    {exp.responsibilities.map((resp: string, i: number) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="resume" className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Manage Resumes
              </h3>
            </div>

            <div className="grid gap-3 sm:gap-4">
              {(candidate.cvs || []).length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No resumes uploaded yet
                  </p>
                </div>
              ) : (
                candidate.cvs.map((resume: any) => (
                  <div
                    key={resume.id}
                    className={cn(
                      "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 sm:gap-0",
                      resume.is_primary
                        ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-700"
                        : "bg-card border-border hover:border-primary/40 shadow-sm",
                    )}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          resume.is_primary
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {resume.file_name || "Resume"}
                          </span>
                          {resume.is_primary && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded on{" "}
                          {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      {!resume.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(resume.id)}
                          disabled={uploading}
                          className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Set as Primary"
                        >
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}

                      <a
                        href={resume.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="View Resume"
                      >
                        <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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

          <TabsContent value="attachments" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Miscellaneous Documents
              </h3>
              <UploadAttachmentDialog
                candidateId={id}
                attachmentTypes={attachmentTypes}
                onSuccess={(updated) => setCandidate(updated)}
              />
            </div>

            <div className="grid gap-3 sm:gap-4">
              {(candidate.attachments || []).length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                  <Paperclip className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No attachments found</p>
                </div>
              ) : (
                candidate.attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm hover:border-primary/40 transition-all gap-3 sm:gap-0"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {attachment.file_name || attachment.filename}
                          </span>
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded-full">
                            {attachment.document_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded on{" "}
                          {new Date(attachment.created_at)
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, ".")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View Attachment"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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