"use client";

import { useState } from "react";
import { getCandidateById, matchJobs } from "@/lib/candidates/data";
import { setPrimaryResume } from "@/lib/candidates/action";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteResumeButton } from "./DeleteCandiResumeButton";
import { DeleteAttachmentButton } from "./DeleteAttachmentButton";
import { UploadAttachmentDialog } from "./UploadCandiAttachment";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { GenerateDeloitteButton } from "./GenerateDeloitteButton";
import { useUser } from "@/app/contexts/UserContext";

type Props = {
  id: string;
  empData: any;
};

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "INR", label: "₹ INR — Indian Rupee" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "A$ AUD — Australian Dollar" },
  { value: "CAD", label: "C$ CAD — Canadian Dollar" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "JPY", label: "¥ JPY — Japanese Yen" },
  { value: "CNY", label: "¥ CNY — Chinese Yuan" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
];

const RATE_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const AVAILABILITY_OPTIONS = [
  "Immediate",
  "2 weeks",
  "1 month",
  "3 months",
  "Not Available",
];

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "€", USD: "$", GBP: "£", INR: "₹", AED: "AED",
    SGD: "SGD", AUD: "A$", CAD: "C$", CHF: "CHF", JPY: "¥",
    CNY: "¥", SAR: "SAR", MYR: "MYR",
  };
  return symbols[currency] || currency;
}

function formatRateType(rt: string | null): string {
  if (!rt) return "Not set";
  return rt.charAt(0).toUpperCase() + rt.slice(1);
}

function openFileViewer(fileUrl: string) {
  const ext = fileUrl?.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    window.open(fileUrl, "_blank");
    return;
  }
  window.open(`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`, "_blank");
}

export default function CandidateDetails({ id, empData }: Props) {
  const [candidate, setCandidate] = useState<any>(
    empData?.status === "processing" ? null : empData,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const [rateType, setRateType] = useState<string>(empData?.rate_type ?? "hourly");
  const [currency, setCurrency] = useState<string>(empData?.currency ?? "EUR");
  const [proposedRateType, setProposedRateType] = useState<string>(empData?.proposed_rate_type ?? "daily");
  const [proposedCurrency, setProposedCurrency] = useState<string>(empData?.proposed_currency ?? "EUR");
  const [requestedRateAmount, setRequestedRateAmount] = useState<string>(empData?.hourly_rate?.toString() ?? "");
  const [proposedRateAmount, setProposedRateAmount] = useState<string>(empData?.proposed_rate?.toString() ?? "");

  const [firstName, setFirstName] = useState<string>(empData?.first_name ?? "");
  const [lastName, setLastName] = useState<string>(empData?.last_name ?? "");
  const [email, setEmail] = useState<string>(empData?.email ?? "");
  const [phone, setPhone] = useState<string>(empData?.phone ?? "");
  const [location, setLocation] = useState<string>(empData?.location ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState<string>(empData?.linkedin_url ?? "");
  const [currentTitle, setCurrentTitle] = useState<string>(empData?.current_title ?? "");
  const [currentCompany, setCurrentCompany] = useState<string>(empData?.current_company ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(empData?.years_of_experience?.toString() ?? "");
  const [skillsText, setSkillsText] = useState<string>((empData?.skills || []).join(", "));
  const [availability, setAvailability] = useState<string>(empData?.availability ?? "");
  const [availabilityMode, setAvailabilityMode] = useState<string>(
    empData?.availability && AVAILABILITY_OPTIONS.includes(empData.availability)
      ? empData.availability
      : empData?.availability
        ? "custom"
        : ""
  );
  const [experienceLevel, setExperienceLevel] = useState<string>(empData?.experience_level ?? "");
  const [vendor, setVendor] = useState<string>(empData?.vendor ?? "");

  const calculateDailyRate = (amount: string, type: string): number | null => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;
    if (type === "hourly") return val * 8;
    if (type === "daily") return val;
    if (type === "weekly") return val / 5;
    if (type === "monthly") return val / 22;
    return null;
  };

  const liveDailyRate = calculateDailyRate(requestedRateAmount, rateType);
  const liveProposedDailyRate = calculateDailyRate(proposedRateAmount, proposedRateType);

  const router = useRouter();
  const { user } = useUser();
  const canEdit = (user as any)?.role === "admin" || (user as any)?.role === "candidate_editor";

  async function runJobMatching(candidateData: any) {
    setMatching(true);
    try {
      const matchData = await matchJobs(candidateData.id);
      const topMatches = (matchData.results || [])
        .map((item: any) => ({ ...item, match_score: Number(item.match_score) || 0 }))
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 5);
      setMatches(topMatches);
    } catch (error) {
      console.error("Matching error:", error);
    }
    setMatching(false);
  }

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      const payload: Record<string, any> = {};

      if (candidate?.status) payload.status = candidate.status;
      if (firstName.trim()) payload.first_name = firstName.trim();
      payload.last_name = lastName.trim();
      if (email.trim() && email.includes("@")) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (location.trim()) payload.location = location.trim();
      if (linkedinUrl.trim()) payload.linkedin_url = linkedinUrl.trim();
      if (currentTitle.trim()) payload.current_title = currentTitle.trim();
      if (currentCompany.trim()) payload.current_company = currentCompany.trim();
      if (yearsOfExperience !== "") {
        const yoe = parseInt(yearsOfExperience);
        if (!isNaN(yoe)) payload.years_of_experience = yoe;
      }
      if (skillsText.trim()) {
        payload.skills = skillsText.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      }
      if (availability) payload.availability = availability;
      if (experienceLevel) payload.experience_level = experienceLevel;
      if (vendor.trim()) payload.vendor = vendor.trim();

      if (requestedRateAmount !== "") {
        const parsed = parseFloat(requestedRateAmount);
        if (!isNaN(parsed)) payload.hourly_rate = parsed;
      }
      payload.rate_type = rateType;
      payload.currency = currency;

      if (proposedRateAmount !== "") {
        const parsed = parseFloat(proposedRateAmount);
        if (!isNaN(parsed)) payload.proposed_rate = parsed;
      }
      payload.proposed_rate_type = proposedRateType;
      payload.proposed_currency = proposedCurrency;

      const res = await fetch(`${apiUrl}/api/v1/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Update failed:", text);
        throw new Error("Failed to update candidate");
      }

      const updated = await res.json();
      setCandidate((prev: any) => ({ ...prev, ...updated }));
      if (updated.rate_type) setRateType(updated.rate_type);
      if (updated.currency) setCurrency(updated.currency);
      if (updated.proposed_rate_type) setProposedRateType(updated.proposed_rate_type);
      if (updated.proposed_currency) setProposedCurrency(updated.proposed_currency);
      if (updated.first_name) setFirstName(updated.first_name);
      if (updated.last_name !== undefined) setLastName(updated.last_name ?? "");
      if (updated.email !== undefined) setEmail(updated.email ?? "");
      if (updated.phone) setPhone(updated.phone ?? "");
      if (updated.location) setLocation(updated.location ?? "");
      if (updated.linkedin_url) setLinkedinUrl(updated.linkedin_url ?? "");
      if (updated.current_title) setCurrentTitle(updated.current_title ?? "");
      if (updated.current_company) setCurrentCompany(updated.current_company ?? "");
      if (updated.years_of_experience !== undefined) setYearsOfExperience(updated.years_of_experience?.toString() ?? "");
      if (updated.skills) setSkillsText((updated.skills || []).join(", "));
      if (updated.availability !== undefined) {
        const newAvail = updated.availability ?? "";
        setAvailability(newAvail);
        setAvailabilityMode(
          AVAILABILITY_OPTIONS.includes(newAvail) ? newAvail : newAvail ? "custom" : ""
        );
      }
      if (updated.experience_level) setExperienceLevel(updated.experience_level ?? "");
      if (updated.vendor) setVendor(updated.vendor ?? "");

      setIsEditing(false);
      toast.success("Candidate updated successfully");
      router.refresh();
    } catch (error: any) {
      console.error("Update failed:", error);
      toast.error(error?.message || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPrimary(resumeId: string) {
    setSettingPrimaryId(resumeId);
    try {
      await setPrimaryResume(id, resumeId);
      const updated = await getCandidateById(id);
      setCandidate(updated);
      toast.success("Primary resume updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to set primary resume");
    } finally {
      setSettingPrimaryId(null);
    }
  }

  if (loading || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-4 border-[#429ABD] border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  const experience = candidate.experience?.length
    ? candidate.experience
    : (candidate.json_data?.experience ?? []);

  const education = candidate.education?.length
    ? candidate.education
    : (candidate.json_data?.education ?? []);

  const attachmentTypes = [
    "Certification", "Portfolio", "Qualification", "License",
    "Cover Letter", "Reference Letter", "Other",
  ];

  const fieldClass = "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#429ABD] focus:border-[#429ABD]";

  const sectionHeader = (title: string, color: string = "#429ABD") => (
    <h2 className="text-base sm:text-lg font-semibold" style={{ color }}>{title}</h2>
  );

  const rateCard = (
    title: string,
    borderColor: string,
    rateValue: string,
    setRateValue: (v: string) => void,
    typeValue: string,
    setType: (v: string) => void,
    currValue: string,
    setCurr: (v: string) => void,
    liveDailyRateValue: number | null,
  ) => (
    <div className="border-2 rounded-xl p-4 sm:p-5 space-y-4" style={{ borderColor }}>
      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: borderColor }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Amount</label>
          <input
            type="number"
            step="0.01"
            value={rateValue}
            onChange={(e) => setRateValue(e.target.value)}
            disabled={!isEditing}
            placeholder={isEditing ? "Enter amount" : "Not set"}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Type</label>
          {isEditing ? (
            <select value={typeValue} onChange={(e) => setType(e.target.value)} className={fieldClass}>
              {RATE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input value={formatRateType(typeValue)} disabled className={fieldClass} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Currency</label>
          {isEditing ? (
            <select value={currValue} onChange={(e) => setCurr(e.target.value)} className={fieldClass}>
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input value={currValue ?? "EUR"} disabled className={fieldClass} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Daily Rate (auto)</label>
          <input
            value={liveDailyRateValue !== null ? `${getCurrencySymbol(currValue)} ${liveDailyRateValue.toFixed(2)}` : "Not set"}
            disabled
            className={`${fieldClass} font-semibold`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "#429ABD" }}>Candidate Details</h2>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <div className="overflow-x-auto pb-2 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 min-w-max sm:min-w-0 gap-1">
            <TabsTrigger value="basic" className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300">Basic Info</TabsTrigger>
            <TabsTrigger value="experience" className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300">Experience</TabsTrigger>
            <TabsTrigger value="resume" className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300">Resumes</TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300">Attachments</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 sm:mt-6">
          <TabsContent value="basic" className="space-y-4 sm:space-y-6">
            <div className="flex justify-end">
              {!isEditing && canEdit ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
                  style={{ backgroundColor: "#429ABD", color: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
                >
                  Edit Candidate
                </button>
              ) : !isEditing ? null : (
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted transition-colors flex-1 sm:flex-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg flex-1 sm:flex-none"
                    style={{ backgroundColor: saving ? "#F5A623" : "#429ABD", pointerEvents: saving ? "none" : "auto" }}
                    onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#F5A623"; }}
                    onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#429ABD"; }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="First name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Last name"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
                {isEditing ? (
                  <Select
                    value={candidate?.status ?? "active"}
                    onValueChange={(value) => setCandidate((prev: any) => ({ ...prev, status: value }))}
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
                  <input value={candidate?.status === "active" ? "Active" : "Inactive"} disabled className={fieldClass} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Email address"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Phone number"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Location"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Current Title</label>
                <input
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Current title"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Current Company</label>
                <input
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Current company"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">LinkedIn URL</label>
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  disabled={!isEditing}
                  placeholder="LinkedIn URL"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Years of Experience</label>
                <input
                  type="number"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Years of experience"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Experience Level</label>
                {isEditing ? (
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={fieldClass}>
                    <option value="">Select level</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                  </select>
                ) : (
                  <input value={experienceLevel || "Not set"} disabled className={fieldClass} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Availability</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      value={availabilityMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvailabilityMode(val);
                        if (val !== "custom") {
                          setAvailability(val);
                        } else {
                          setAvailability("");
                        }
                      }}
                      className={fieldClass}
                    >
                      <option value="">Select availability</option>
                      <option value="Immediate">Immediate</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="3 months">3 months</option>
                      <option value="Not Available">Not Available</option>
                      <option value="custom">Custom</option>
                    </select>
                    {availabilityMode === "custom" && (
                      <input
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        placeholder="e.g. 1 week, 3 weeks, 2 months"
                        className={fieldClass}
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input value={availability || "Not set"} disabled className={fieldClass} />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Skills</label>
              <textarea
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                disabled={!isEditing}
                rows={6}
                placeholder="React, Node.js, Python..."
                className={fieldClass}
              />
            </div>

            {sectionHeader("Rate & Vendor Details")}

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Vendor</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                disabled={!isEditing}
                placeholder={isEditing ? "Enter vendor name" : "Not set"}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {rateCard("Requested Rate", "#429ABD", requestedRateAmount, setRequestedRateAmount, rateType, setRateType, currency, setCurrency, liveDailyRate)}
              {rateCard("Proposed Rate", "#F5A623", proposedRateAmount, setProposedRateAmount, proposedRateType, setProposedRateType, proposedCurrency, setProposedCurrency, liveProposedDailyRate)}
            </div>

            {sectionHeader("Educational Details")}

            {education.length > 0 ? (
              education.map((edu: any, index: number) => (
                <div key={index} className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2">
                  <div className="font-semibold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-foreground">
                    <span>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ""}</span>
                    {(edu.start_date || edu.end_date) && (
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        {edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : edu.start_date ? edu.start_date : edu.end_date}
                      </span>
                    )}
                  </div>
                  <div><span className="text-xs sm:text-sm text-muted-foreground">{edu.institution}</span></div>
                  {edu.grade && <div className="text-xs sm:text-sm text-muted-foreground">Grade: {edu.grade}</div>}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No Education Details</div>
            )}

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                {sectionHeader(`Matching Requests (${matches.length})`, "#F5A623")}
                <button
                  type="button"
                  onClick={() => runJobMatching(candidate)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm text-white disabled:opacity-50 transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
                  style={{ backgroundColor: "#429ABD" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
                >
                  {matching ? "Matching..." : "Find Matching Requests"}
                </button>
              </div>
              {matching ? (
                <p className="text-muted-foreground text-sm">Finding matching requests...</p>
              ) : matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">No matching request found. Click the button above to run the matching process.</p>
              ) : (
                <div className="grid gap-4">
                  {matches.map((job) => (
                    <div key={job.job_id} className="border border-border rounded-lg p-4 shadow-sm bg-card hover:border-[#429ABD]/30 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{job.job_title || "Request"}</h3>
                        <span className="px-2 py-1 rounded text-xs sm:text-sm font-semibold" style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}>
                          {Number(job.match_score).toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        <span className="font-bold text-foreground">Reasoning:</span> {job.reasoning}
                      </p>
                      {job.strengths?.length > 0 && (
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          <span className="font-bold text-foreground">Strengths:</span> {job.strengths.join(", ")}
                        </div>
                      )}
                      {job.gaps?.length > 0 && (
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          <span className="font-bold text-foreground">Gaps:</span> {job.gaps.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="experience" className="space-y-4 sm:space-y-6">
            {experience.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <p className="text-sm text-muted-foreground">No experience data found</p>
              </div>
            ) : (
              experience.map((exp: any, index: number) => (
                <div key={index} className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2 hover:border-[#429ABD]/30 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row justify-between gap-2 text-base sm:text-lg font-semibold text-foreground">
                    <span>{exp.job_title}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {(exp.start_date || exp.end_date) && (
                        <span>
                          {exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : exp.start_date ? exp.start_date : exp.end_date}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {exp.company} {exp.location ? `- ${exp.location}` : ""}
                  </div>
                  {exp.responsibilities && (
                    <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1">
                      {Array.isArray(exp.responsibilities) ? (
                        exp.responsibilities.map((resp: string, i: number) => <li key={i}>{resp}</li>)
                      ) : (
                        <li>{exp.responsibilities}</li>
                      )}
                    </ul>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="resume" className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold text-foreground" style={{ color: "#429ABD" }}>Manage Resumes</h3>
            </div>
            <div className="grid gap-3 sm:gap-4">
              {(candidate.cvs || []).length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No resumes uploaded yet</p>
                </div>
              ) : (
                candidate.cvs.map((resume: any) => (
                  <div key={resume.id} onClick={() => openFileViewer(resume.file_url)} className="rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 sm:gap-0 cursor-pointer hover:bg-[#429ABD08] hover:border-[#429ABD] border border-transparent transition-all duration-300">
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className={cn("p-2 rounded-lg", resume.is_primary ? "bg-[#429ABD20] text-[#429ABD]" : "bg-muted text-muted-foreground")}>
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); openFileViewer(resume.file_url); }} className="font-medium text-sm text-[#429ABD] hover:underline hover:text-blue-600 text-left">
                              {resume.file_name || "Resume"}
                            </button>
                            {resume.is_primary && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full" style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}>Primary</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Uploaded on {new Date(resume.created_at).toLocaleDateString("en-GB").replace(/\//g, ".")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        {!resume.is_primary && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSetPrimary(resume.id); }} disabled={settingPrimaryId === resume.id} className="px-3 py-1.5 text-sm font-medium text-white bg-[#429ABD] hover:bg-[#F5A623] rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {settingPrimaryId === resume.id ? "Setting..." : "Set as primary"}
                          </button>
                        )}
                        {(candidate.cvs || []).length > 1 && (
                          <DeleteResumeButton candidateId={id} resumeId={resume.id} onSuccess={(updated) => setCandidate(updated)} />
                        )}
                      </div>
                    </div>
                    {resume.is_primary && (
                      <div onClick={(e) => { e.stopPropagation(); if (!resume.deloitte_pptx_url) return; openFileViewer(resume.deloitte_pptx_url); }} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 sm:gap-0 cursor-pointer hover:bg-[#F5A62308] hover:border-[#F5A623] border border-transparent transition-all duration-300", resume.deloitte_pptx_url ? "bg-[#429ABD06]" : "bg-muted/20")}>
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div className={cn("p-2 rounded-lg", resume.deloitte_pptx_url ? "bg-[#429ABD20] text-[#429ABD]" : "bg-muted/60 text-muted-foreground")}>
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={(e) => { e.stopPropagation(); if (resume.deloitte_pptx_url) openFileViewer(resume.deloitte_pptx_url); }} className="font-medium text-sm text-[#429ABD] hover:text-blue-600 hover:underline cursor-pointer text-left">
                                {`${(resume.file_name || "Resume").replace(/\.[^/.]+$/, "")}_Deloitte.pptx`}
                              </button>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full" style={{ backgroundColor: "#F5A62320", color: "#F5A623" }}>Deloitte</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{resume.deloitte_pptx_url ? "Generated Deloitte Resume" : "Not generated yet"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <GenerateDeloitteButton candidateId={id} cvId={resume.id} deloittePptxUrl={resume.deloitte_pptx_url || null} cvFileName={resume.file_name || "Resume"} onSuccess={(updated) => setCandidate(updated)} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-foreground" style={{ color: "#429ABD" }}>Miscellaneous Documents</h3>
              <UploadAttachmentDialog candidateId={id} attachmentTypes={attachmentTypes} onSuccess={(updated) => setCandidate(updated)} />
            </div>
            <div className="grid gap-3 sm:gap-4">
              {(candidate.attachments || []).length === 0 ? (
                <div className="text-center py-8 sm:py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                  <Paperclip className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No attachments found</p>
                </div>
              ) : (
                candidate.attachments.map((attachment: any) => (
                  <div key={attachment.id} onClick={() => openFileViewer(attachment.file_url)} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm hover:border-[#429ABD]/40 hover:bg-[#429ABD08] transition-all duration-300 gap-3 sm:gap-0 cursor-pointer">
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="p-2 bg-[#429ABD10] text-[#429ABD] rounded-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openFileViewer(attachment.file_url); }} className="font-medium text-sm text-[#429ABD] hover:text-blue-600 hover:underline cursor-pointer text-left">
                            {attachment.file_name || attachment.filename}
                          </button>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#F5A62320", color: "#F5A623" }}>
                            {attachment.document_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Uploaded on {new Date(attachment.created_at).toLocaleDateString("en-GB").replace(/\//g, ".")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto sm:ml-0" onClick={(e) => e.stopPropagation()}>
                      <DeleteAttachmentButton candidateId={id} attachmentId={attachment.id} onSuccess={(updated) => setCandidate(updated)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}