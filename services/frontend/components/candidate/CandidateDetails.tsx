"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getCandidateById } from "@/lib/candidates/data";
import { setPrimaryResume } from "@/lib/candidates/action";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, FileText, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteResumeButton } from "./DeleteCandiResumeButton";
import { DeleteAttachmentButton } from "./DeleteAttachmentButton";
import { UploadAttachmentDialog } from "./UploadCandiAttachment";
import CandidateProposedRequests from "./CandidateProposedRequests";
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
import { Checkbox } from "../ui/checkbox";

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
    EUR: "€",
    USD: "$",
    GBP: "£",
    INR: "₹",
    AED: "AED",
    SGD: "SGD",
    AUD: "A$",
    CAD: "C$",
    CHF: "CHF",
    JPY: "¥",
    CNY: "¥",
    SAR: "SAR",
    MYR: "MYR",
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
  window.open(
    `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`,
    "_blank",
  );
}

export default function CandidateDetails({ id, empData }: Props) {
  const [candidate, setCandidate] = useState<any>(
    empData?.status === "processing" ? null : empData,
  );
  const sapSecureId =
    candidate?.sap_secure_id ?? empData?.sap_secure_id ?? null;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const [rateType, setRateType] = useState<string>(
    empData?.rate_type ?? "hourly",
  );
  const [currency, setCurrency] = useState<string>(empData?.currency ?? "EUR");
  const [proposedRateType, setProposedRateType] = useState<string>(
    empData?.proposed_rate_type ?? "daily",
  );
  const [proposedCurrency, setProposedCurrency] = useState<string>(
    empData?.proposed_currency ?? "EUR",
  );
  const [requestedRateAmount, setRequestedRateAmount] = useState<string>(
    empData?.hourly_rate?.toString() ?? "",
  );
  const [proposedRateAmount, setProposedRateAmount] = useState<string>(
    empData?.proposed_rate?.toString() ?? "",
  );

  const [firstName, setFirstName] = useState<string>(empData?.first_name ?? "");
  const [lastName, setLastName] = useState<string>(empData?.last_name ?? "");
  const [email, setEmail] = useState<string>(empData?.email ?? "");
  const [phone, setPhone] = useState<string>(empData?.phone ?? "");
  const [location, setLocation] = useState<string>(empData?.location ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState<string>(
    empData?.linkedin_url ?? "",
  );
  const [currentTitle, setCurrentTitle] = useState<string>(
    empData?.current_title ?? "",
  );
  const [currentCompany, setCurrentCompany] = useState<string>(
    empData?.current_company ?? "",
  );
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(
    empData?.years_of_experience?.toString() ?? "",
  );
  const [skillsText, setSkillsText] = useState<string>(
    (empData?.skills || []).join(", "),
  );
  const [availability, setAvailability] = useState<string>(
    empData?.availability ?? "",
  );
  const [availabilityMode, setAvailabilityMode] = useState<string>(
    empData?.availability && AVAILABILITY_OPTIONS.includes(empData.availability)
      ? empData.availability
      : empData?.availability
        ? "custom"
        : "",
  );
  const [experienceLevel, setExperienceLevel] = useState<string>(
    empData?.experience_level ?? "",
  );
  const [vendor, setVendor] = useState<string>(empData?.vendor ?? "");
  const [dob, setDob] = useState(empData?.dob ?? "");
  const [ssnLast4, setSsnLast4] = useState(empData?.ssn_last4 ?? "");
  const [showSsn, setShowSsn] = useState(false);
  const [workAuthorization, setWorkAuthorization] = useState(
    empData?.work_authorization ?? "",
  );
  const [interviewAvailability, setInterviewAvailability] = useState(
    empData?.interview_availability ?? "",
  );
  const [willingToTravel, setWillingToTravel] = useState(
    empData?.willing_to_travel ?? false,
  );
  const [willingInperson, setWillingInperson] = useState(
    empData?.willing_inperson ?? false,
  );
  const [usExperience, setUsExperience] = useState(
    empData?.us_experience?.toString() ?? "",
  );
  const [pendingOffers, setPendingOffers] = useState(
    empData?.pending_offers ?? false,
  );
  const [pendingOffersDetails, setPendingOffersDetails] = useState(
    empData?.pending_offers_details ?? "",
  );

  type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originalValues = useRef({
    firstName: empData?.first_name ?? "",
    lastName: empData?.last_name ?? "",
    email: empData?.email ?? "",
    phone: empData?.phone ?? "",
    location: empData?.location ?? "",
    linkedinUrl: empData?.linkedin_url ?? "",
    currentTitle: empData?.current_title ?? "",
    currentCompany: empData?.current_company ?? "",
    yearsOfExperience: empData?.years_of_experience?.toString() ?? "",
    skillsText: (empData?.skills || []).join(", "),
    availability: empData?.availability ?? "",
    availabilityMode:
      empData?.availability &&
      AVAILABILITY_OPTIONS.includes(empData.availability)
        ? empData.availability
        : empData?.availability
          ? "custom"
          : "",
    experienceLevel: empData?.experience_level ?? "",
    vendor: empData?.vendor ?? "",
    dob: empData?.dob ?? "",
    ssnLast4: empData?.ssn_last4 ?? "",
    workAuthorization: empData?.work_authorization ?? "",
    interviewAvailability: empData?.interview_availability ?? "",
    willingToTravel: empData?.willing_to_travel ?? false,
    willingInperson: empData?.willing_inperson ?? false,
    usExperience: empData?.us_experience?.toString() ?? "",
    pendingOffers: empData?.pending_offers ?? false,
    pendingOffersDetails: empData?.pending_offers_details ?? "",
    rateType: empData?.rate_type ?? "hourly",
    currency: empData?.currency ?? "EUR",
    proposedRateType: empData?.proposed_rate_type ?? "daily",
    proposedCurrency: empData?.proposed_currency ?? "EUR",
    requestedRateAmount: empData?.hourly_rate?.toString() ?? "",
    proposedRateAmount: empData?.proposed_rate?.toString() ?? "",
    candidateStatus: empData?.status ?? "",
  });

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
  const liveProposedDailyRate = calculateDailyRate(
    proposedRateAmount,
    proposedRateType,
  );

  const router = useRouter();
  const { user } = useUser();
  const canEdit =
    (user as any)?.role === "admin" ||
    (user as any)?.role === "candidate_editor";
  //set to true always in editing mode
  const [isEditing, setIsEditing] = useState(true);

  const isDirty = useCallback(() => {
    const o = originalValues.current;
    return (
      firstName !== o.firstName ||
      lastName !== o.lastName ||
      email !== o.email ||
      phone !== o.phone ||
      location !== o.location ||
      linkedinUrl !== o.linkedinUrl ||
      currentTitle !== o.currentTitle ||
      currentCompany !== o.currentCompany ||
      yearsOfExperience !== o.yearsOfExperience ||
      skillsText !== o.skillsText ||
      availability !== o.availability ||
      experienceLevel !== o.experienceLevel ||
      vendor !== o.vendor ||
      dob !== o.dob ||
      ssnLast4 !== o.ssnLast4 ||
      workAuthorization !== o.workAuthorization ||
      interviewAvailability !== o.interviewAvailability ||
      willingToTravel !== o.willingToTravel ||
      willingInperson !== o.willingInperson ||
      usExperience !== o.usExperience ||
      pendingOffers !== o.pendingOffers ||
      pendingOffersDetails !== o.pendingOffersDetails ||
      rateType !== o.rateType ||
      currency !== o.currency ||
      proposedRateType !== o.proposedRateType ||
      proposedCurrency !== o.proposedCurrency ||
      requestedRateAmount !== o.requestedRateAmount ||
      proposedRateAmount !== o.proposedRateAmount
    );
  }, [
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedinUrl,
    currentTitle,
    currentCompany,
    yearsOfExperience,
    skillsText,
    availability,
    experienceLevel,
    vendor,
    dob,
    ssnLast4,
    workAuthorization,
    interviewAvailability,
    willingToTravel,
    willingInperson,
    usExperience,
    pendingOffers,
    pendingOffersDetails,
    rateType,
    currency,
    proposedRateType,
    proposedCurrency,
    requestedRateAmount,
    proposedRateAmount,
  ]);

  useEffect(() => {
    if (!canEdit || !isEditing) return;
    if (!isDirty()) {
      setAutoSaveStatus("idle");
      return;
    }
    setAutoSaveStatus("pending");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSubmit(true);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedinUrl,
    currentTitle,
    currentCompany,
    yearsOfExperience,
    skillsText,
    availability,
    experienceLevel,
    vendor,
    dob,
    ssnLast4,
    workAuthorization,
    interviewAvailability,
    willingToTravel,
    willingInperson,
    usExperience,
    pendingOffers,
    pendingOffersDetails,
    rateType,
    currency,
    proposedRateType,
    proposedCurrency,
    requestedRateAmount,
    proposedRateAmount,
  ]);

  function handleCancel() {
    const o = originalValues.current;
    setFirstName(o.firstName);
    setLastName(o.lastName);
    setEmail(o.email);
    setPhone(o.phone);
    setLocation(o.location);
    setLinkedinUrl(o.linkedinUrl);
    setCurrentTitle(o.currentTitle);
    setCurrentCompany(o.currentCompany);
    setYearsOfExperience(o.yearsOfExperience);
    setSkillsText(o.skillsText);
    setAvailability(o.availability);
    setAvailabilityMode(o.availabilityMode);
    setExperienceLevel(o.experienceLevel);
    setVendor(o.vendor);
    setDob(o.dob);
    setSsnLast4(o.ssnLast4);
    setWorkAuthorization(o.workAuthorization);
    setInterviewAvailability(o.interviewAvailability);
    setWillingToTravel(o.willingToTravel);
    setWillingInperson(o.willingInperson);
    setUsExperience(o.usExperience);
    setPendingOffers(o.pendingOffers);
    setPendingOffersDetails(o.pendingOffersDetails);
    setRateType(o.rateType);
    setCurrency(o.currency);
    setProposedRateType(o.proposedRateType);
    setProposedCurrency(o.proposedCurrency);
    setRequestedRateAmount(o.requestedRateAmount);
    setProposedRateAmount(o.proposedRateAmount);
    setAutoSaveStatus("idle");
    setIsEditing(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }

  async function runJobMatching(candidateData: any) {
    setMatching(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(
        `http://localhost:8000/api/v1/candidates/${candidateData.id}/match-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to match");
      const matchData = await res.json();
      const topMatches = (matchData.results || [])
        .map((item: any) => ({
          ...item,
          match_score: Number(item.match_score) || 0,
        }))
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 5);
      setMatches(topMatches);
      if (topMatches.length === 0) {
        toast.info("No matching requests found for this candidate");
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
      } else {
        console.error("Matching error:", error);
        toast.error("Failed to find matching requests");
      }
    }
    setMatching(false);
  }
  async function handleSubmit(isAutoSave = false) {
    if (saving) return;
    setSaving(true);
    if (!isAutoSave) setAutoSaveStatus("saving");
    else setAutoSaveStatus("saving");
    try {
      const token = localStorage.getItem("access_token") || "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const payload: Record<string, any> = {};

      if (candidate?.status) payload.status = candidate.status;
      if (firstName.trim()) payload.first_name = firstName.trim();
      payload.last_name = lastName.trim();
      if (email.trim() && email.includes("@")) payload.email = email.trim();
      const cleanPhone = phone.trim();
      if (cleanPhone && cleanPhone !== "NA" && cleanPhone !== "na")
        payload.phone = cleanPhone;
      const cleanLocation = location.trim();
      if (cleanLocation && cleanLocation !== "NA" && cleanLocation !== "na")
        payload.location = cleanLocation;
      const cleanLinkedin = linkedinUrl.trim();
      if (cleanLinkedin && cleanLinkedin !== "NA" && cleanLinkedin !== "na")
        payload.linkedin_url = cleanLinkedin;
      if (currentTitle.trim()) payload.current_title = currentTitle.trim();
      if (currentCompany.trim())
        payload.current_company = currentCompany.trim();
      if (yearsOfExperience !== "") {
        const yoe = parseInt(yearsOfExperience);
        if (!isNaN(yoe)) payload.years_of_experience = yoe;
      }
      if (skillsText.trim()) {
        payload.skills = skillsText
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
      if (availability) payload.availability = availability;
      if (experienceLevel) payload.experience_level = experienceLevel;
      if (vendor.trim()) payload.vendor = vendor.trim();
      payload.dob = dob.trim();
      payload.ssn_last4 = ssnLast4.trim();
      payload.work_authorization = workAuthorization.trim();
      payload.interview_availability = interviewAvailability.trim();
      payload.willing_to_travel = willingToTravel;
      payload.willing_inperson = willingInperson;
      if (usExperience !== "") {
        const years = parseInt(usExperience);
        if (!isNaN(years)) payload.us_experience = years;
      }
      payload.pending_offers = pendingOffers;
      payload.pending_offers_details = pendingOffers
        ? pendingOffersDetails.trim()
        : "";
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
      if (updated.proposed_rate_type)
        setProposedRateType(updated.proposed_rate_type);
      if (updated.proposed_currency)
        setProposedCurrency(updated.proposed_currency);
      if (updated.first_name) setFirstName(updated.first_name);
      if (updated.last_name !== undefined) setLastName(updated.last_name ?? "");
      if (updated.email !== undefined) setEmail(updated.email ?? "");
      if (updated.phone) setPhone(updated.phone ?? "");
      if (updated.location) setLocation(updated.location ?? "");
      if (updated.linkedin_url) setLinkedinUrl(updated.linkedin_url ?? "");
      if (updated.current_title) setCurrentTitle(updated.current_title ?? "");
      if (updated.current_company)
        setCurrentCompany(updated.current_company ?? "");
      if (updated.years_of_experience !== undefined)
        setYearsOfExperience(updated.years_of_experience?.toString() ?? "");
      if (updated.skills) setSkillsText((updated.skills || []).join(", "));
      if (updated.availability !== undefined) {
        const newAvail = updated.availability ?? "";
        setAvailability(newAvail);
        setAvailabilityMode(
          AVAILABILITY_OPTIONS.includes(newAvail)
            ? newAvail
            : newAvail
              ? "custom"
              : "",
        );
      }
      if (updated.experience_level)
        setExperienceLevel(updated.experience_level ?? "");
      if (updated.vendor) setVendor(updated.vendor ?? "");
      setDob(updated.dob ?? "");
      setSsnLast4(updated.ssn_last4 ?? "");
      setWorkAuthorization(updated.work_authorization ?? "");
      setInterviewAvailability(updated.interview_availability ?? "");
      setWillingToTravel(updated.willing_to_travel ?? false);
      setWillingInperson(updated.willing_inperson ?? false);
      setUsExperience(updated.us_experience?.toString() ?? "");
      setPendingOffers(updated.pending_offers ?? false);
      setPendingOffersDetails(updated.pending_offers_details ?? "");

      setAutoSaveStatus("saved");
      originalValues.current = {
        firstName: updated.first_name ?? firstName,
        lastName: updated.last_name ?? lastName,
        email: updated.email ?? email,
        phone: updated.phone ?? phone,
        location: updated.location ?? location,
        linkedinUrl: updated.linkedin_url ?? linkedinUrl,
        currentTitle: updated.current_title ?? currentTitle,
        currentCompany: updated.current_company ?? currentCompany,
        yearsOfExperience:
          updated.years_of_experience?.toString() ?? yearsOfExperience,
        skillsText: updated.skills
          ? (updated.skills as string[]).join(", ")
          : skillsText,
        availability: updated.availability ?? availability,
        availabilityMode: AVAILABILITY_OPTIONS.includes(
          updated.availability ?? "",
        )
          ? updated.availability
          : updated.availability
            ? "custom"
            : "",
        experienceLevel: updated.experience_level ?? experienceLevel,
        vendor: updated.vendor ?? vendor,
        dob: updated.dob ?? dob,
        ssnLast4: updated.ssn_last4 ?? ssnLast4,
        workAuthorization: updated.work_authorization ?? workAuthorization,
        interviewAvailability:
          updated.interview_availability ?? interviewAvailability,
        willingToTravel: updated.willing_to_travel ?? willingToTravel,
        willingInperson: updated.willing_inperson ?? willingInperson,
        usExperience: updated.us_experience?.toString() ?? usExperience,
        pendingOffers: updated.pending_offers ?? pendingOffers,
        pendingOffersDetails:
          updated.pending_offers_details ?? pendingOffersDetails,
        rateType: updated.rate_type ?? rateType,
        currency: updated.currency ?? currency,
        proposedRateType: updated.proposed_rate_type ?? proposedRateType,
        proposedCurrency: updated.proposed_currency ?? proposedCurrency,
        requestedRateAmount:
          updated.hourly_rate?.toString() ?? requestedRateAmount,
        proposedRateAmount:
          updated.proposed_rate?.toString() ?? proposedRateAmount,
        candidateStatus: updated.status ?? candidate?.status ?? "",
      };
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
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
        <p className="text-muted-foreground font-medium">
          Loading candidate profile...
        </p>
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
    "Certification",
    "Portfolio",
    "Qualification",
    "License",
    "Cover Letter",
    "Reference Letter",
    "Other",
  ];

  const fieldClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:opacity-350 disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#429ABD] focus:border-[#429ABD]";

  const sectionHeader = (title: string, color: string = "#429ABD") => (
    <h2 className="text-base sm:text-lg font-semibold" style={{ color }}>
      {title}
    </h2>
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
    <div
      className="border-2 rounded-xl p-4 sm:p-5 space-y-4"
      style={{ borderColor }}
    >
      <h3
        className="text-sm font-bold uppercase tracking-wider"
        style={{ color: borderColor }}
      >
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">
            Rate Amount
          </label>
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
          <label className="block text-xs font-medium mb-1 text-muted-foreground">
            Rate Type
          </label>
          {isEditing ? (
            <select
              value={typeValue}
              onChange={(e) => setType(e.target.value)}
              className={fieldClass}
            >
              {RATE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={formatRateType(typeValue)}
              disabled
              className={fieldClass}
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">
            Currency
          </label>
          {isEditing ? (
            <select
              value={currValue}
              onChange={(e) => setCurr(e.target.value)}
              className={fieldClass}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input value={currValue ?? "EUR"} disabled className={fieldClass} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">
            Daily Rate (auto)
          </label>
          <input
            value={
              liveDailyRateValue !== null
                ? `${getCurrencySymbol(currValue)} ${liveDailyRateValue.toFixed(2)}`
                : "Not set"
            }
            disabled
            className={`${fieldClass} font-semibold`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-card text-card-foreground rounded-xl shadow-sm border border-border p-2 sm:p-4 md:p-6 mt-2">
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2
          className="text-lg sm:text-xl font-bold"
          style={{ color: "#429ABD" }}
        >
          Candidate Details
        </h2>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:shadow-md active:scale-95"
            style={{ backgroundColor: "#429ABD" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#F5A623")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#429ABD")
            }
          >
            Edit
          </button>
        )}
      </div> */}

      <Tabs defaultValue="basic" className="w-full">
        <div className="overflow-x-auto pb-2 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-5 min-w-max sm:min-w-0 gap-1">
            <TabsTrigger
              value="basic"
              className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="experience"
              className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300"
            >
              Experience
            </TabsTrigger>
            <TabsTrigger
              value="resume"
              className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300"
            >
              Resumes
            </TabsTrigger>
            <TabsTrigger
              value="attachments"
              className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300"
            >
              Attachments
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-[#429ABD] data-[state=active]:text-white transition-all duration-300"
            >
              Requests
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 sm:mt-6">
          <TabsContent value="basic" className="space-y-4 sm:space-y-6">
            {isEditing && (
              <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-background/95 backdrop-blur shadow-sm mb-2">
                <div className="flex items-center gap-2 text-xs">
                  {autoSaveStatus === "idle" && (
                    <span className="text-muted-foreground">
                      All changes saved
                    </span>
                  )}
                  {autoSaveStatus === "pending" && (
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Unsaved changes
                    </span>
                  )}
                  {autoSaveStatus === "saving" && (
                    <span className="flex items-center gap-1.5 text-blue-500">
                      <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Auto-saving...
                    </span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span className="flex items-center gap-1.5 text-green-600">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Saved
                    </span>
                  )}
                  {autoSaveStatus === "error" && (
                    <span className="text-red-500">Save failed</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button> */}
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-60 transition-all hover:shadow-md"
                    style={{ backgroundColor: saving ? "#F5A623" : "#429ABD" }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="First name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Last name"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Email address"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  DOB (MM/DD)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={fieldClass}
                    placeholder="MM/DD"
                    maxLength={5}
                  />
                ) : (
                  <input
                    value={dob}
                    placeholder="NA"
                    disabled
                    className={fieldClass}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  SSN Last 4
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isEditing
                        ? showSsn
                          ? ssnLast4
                          : ssnLast4
                            ? "••••"
                            : ""
                        : ssnLast4
                          ? showSsn
                            ? ssnLast4
                            : "••••"
                          : "NA"
                    }
                    onChange={(e) => isEditing && setSsnLast4(e.target.value)}
                    disabled={!isEditing}
                    className={`${fieldClass} pr-10`}
                    placeholder="Last 4 digits"
                    maxLength={4}
                  />
                  {ssnLast4 && (
                    <button
                      type="button"
                      onClick={() => setShowSsn((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showSsn ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Status
                </label>
                {isEditing ? (
                  <Select
                    value={candidate?.status ?? "active"}
                    onValueChange={(value) =>
                      setCandidate((prev: any) => ({ ...prev, status: value }))
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
                    value={
                      candidate?.status === "active" ? "Active" : "Inactive"
                    }
                    disabled
                    className={fieldClass}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Mobile Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Phone number"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Current Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Location"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Work Authorization
                </label>
                <input
                  value={workAuthorization}
                  onChange={(e) => setWorkAuthorization(e.target.value)}
                  disabled={!isEditing}
                  placeholder="US Citizen"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Current Title
                </label>
                <textarea
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  onInput={(e) => {
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  disabled={!isEditing}
                  placeholder="Current title"
                  rows={1}
                  className={`${fieldClass} resize-none overflow-hidden`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Current Company
                </label>
                <textarea
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  onInput={(e) => {
                    e.currentTarget.style.height = "auto";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                  }}
                  disabled={!isEditing}
                  placeholder="Current company"
                  rows={1}
                  className={`${fieldClass} resize-none overflow-hidden`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  LinkedIn URL
                </label>
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  disabled={!isEditing}
                  placeholder="LinkedIn URL"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Years of experience"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  US Experience (Years)
                </label>
                <input
                  type="number"
                  value={usExperience}
                  onChange={(e) => setUsExperience(e.target.value)}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  Availability to join
                </label>
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
                      />
                    )}
                  </div>
                ) : (
                  <input
                    value={availability || "NA"}
                    disabled
                    className={fieldClass}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Interview Availability
              </label>
              <input
                value={interviewAvailability}
                onChange={(e) => setInterviewAvailability(e.target.value)}
                disabled={!isEditing}
                placeholder="Monday to Friday 9AM-5PM"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={willingToTravel}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    isEditing && setWillingToTravel(checked === true)
                  }
                  className="border-gray-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700 disabled:opacity-100"
                />
                Willing to Travel for customer location
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={willingInperson}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    isEditing && setWillingInperson(checked === true)
                  }
                  className="border-gray-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700 disabled:opacity-100"
                />
                Final round: Willing for In-Person Interview
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={pendingOffers}
                  disabled={!isEditing}
                  onCheckedChange={(checked) =>
                    isEditing && setPendingOffers(checked === true)
                  }
                  className="border-gray-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700 disabled:opacity-100"
                />
                Any Pending Offers or Waiting for feedback
              </label>
            </div>

            {pendingOffers && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pending Offer Details
                </label>
                <textarea
                  value={pendingOffersDetails}
                  onChange={(e) => setPendingOffersDetails(e.target.value)}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Waiting for feedback from..."
                  className={fieldClass}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Skills
              </label>
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
              <label className="block text-sm font-medium mb-1 text-foreground">
                Vendor
              </label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                disabled={!isEditing}
                placeholder={isEditing ? "Enter vendor name" : "NA"}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {rateCard(
                "Requested Rate",
                "#429ABD",
                requestedRateAmount,
                setRequestedRateAmount,
                rateType,
                setRateType,
                currency,
                setCurrency,
                liveDailyRate,
              )}
              {rateCard(
                "Proposed Rate",
                "#F5A623",
                proposedRateAmount,
                setProposedRateAmount,
                proposedRateType,
                setProposedRateType,
                proposedCurrency,
                setProposedCurrency,
                liveProposedDailyRate,
              )}
            </div>

            {sectionHeader("Educational Details")}

            {education.length > 0 ? (
              education.map((edu: any, index: number) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2"
                >
                  <div className="font-semibold flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-foreground">
                    <span>
                      {edu.degree}
                      {edu.field_of_study ? ` in ${edu.field_of_study}` : ""}
                    </span>
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
                      Grade: {edu.grade}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center rounded-lg border bg-muted/20 py-8 text-sm text-muted-foreground">
                No education details available.
              </div>
            )}

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                {sectionHeader(
                  `Matching Requests (${matches.length})`,
                  "#F5A623",
                )}
                <button
                  type="button"
                  onClick={() => runJobMatching(candidate)}
                  disabled={matching}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm text-white disabled:opacity-50 transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
                  style={{ backgroundColor: "#429ABD" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#F5A623")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#429ABD")
                  }
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
                      className="border border-border rounded-lg p-4 shadow-sm bg-card hover:border-[#429ABD]/30 transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/requests/${job.job_id}`)}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {job.job_title || "Request"}
                        </h3>
                        <span
                          className="px-2 py-1 rounded text-xs sm:text-sm font-semibold"
                          style={{
                            backgroundColor: "#429ABD20",
                            color: "#429ABD",
                          }}
                        >
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
            {experience.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  No experience data found
                </p>
              </div>
            ) : (
              experience.map((exp: any, index: number) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 sm:p-5 bg-muted/40 space-y-2 hover:border-[#429ABD]/30 transition-all duration-300"
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
                  {exp.responsibilities && (
                    <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-1">
                      {Array.isArray(exp.responsibilities) ? (
                        exp.responsibilities.map((resp: string, i: number) => (
                          <li key={i}>{resp}</li>
                        ))
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
              <h3
                className="text-base sm:text-lg font-semibold text-foreground"
                style={{ color: "#429ABD" }}
              >
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
                    onClick={() => openFileViewer(resume.file_url)}
                    className="rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 sm:gap-0 cursor-pointer hover:bg-[#429ABD08] hover:border-[#429ABD] border border-transparent transition-all duration-300">
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            resume.is_primary
                              ? "bg-[#429ABD20] text-[#429ABD]"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFileViewer(resume.file_url);
                              }}
                              className="font-medium text-sm text-[#429ABD] hover:underline hover:text-blue-600 text-left"
                            >
                              {resume.file_name || "Resume"}
                            </button>
                            {resume.is_primary && (
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                                style={{
                                  backgroundColor: "#429ABD20",
                                  color: "#429ABD",
                                }}
                              >
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Uploaded on{" "}
                            {new Date(resume.created_at)
                              .toLocaleDateString("en-GB")
                              .replace(/\//g, ".")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        {!resume.is_primary && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(resume.id);
                            }}
                            disabled={settingPrimaryId === resume.id}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-[#429ABD] hover:bg-[#F5A623] rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {settingPrimaryId === resume.id
                              ? "Setting..."
                              : "Set as primary"}
                          </button>
                        )}
                        {(candidate.cvs || []).length > 1 && (
                          <DeleteResumeButton
                            candidateId={id}
                            resumeId={resume.id}
                            onSuccess={(updated) => setCandidate(updated)}
                          />
                        )}
                      </div>
                    </div>
                    {resume.is_primary && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!resume.deloitte_pptx_url) return;
                          openFileViewer(resume.deloitte_pptx_url);
                        }}
                        className={cn(
                          "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 sm:gap-0 cursor-pointer hover:bg-[#F5A62308] hover:border-[#F5A623] border border-transparent transition-all duration-300",
                          resume.deloitte_pptx_url
                            ? "bg-[#429ABD06]"
                            : "bg-muted/20",
                        )}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                          <div
                            className={cn(
                              "p-2 rounded-lg",
                              resume.deloitte_pptx_url
                                ? "bg-[#429ABD20] text-[#429ABD]"
                                : "bg-muted/60 text-muted-foreground",
                            )}
                          >
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (resume.deloitte_pptx_url)
                                    openFileViewer(resume.deloitte_pptx_url);
                                }}
                                className="font-medium text-sm text-[#429ABD] hover:text-blue-600 hover:underline cursor-pointer text-left"
                              >
                                {`${(resume.file_name || "Resume").replace(/\.[^/.]+$/, "")}_Deloitte.pptx`}
                              </button>
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                                style={{
                                  backgroundColor: "#F5A62320",
                                  color: "#F5A623",
                                }}
                              >
                                Deloitte
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {resume.deloitte_pptx_url
                                ? "Generated Deloitte Resume"
                                : "Not generated yet"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <GenerateDeloitteButton
                            candidateId={id}
                            cvId={resume.id}
                            deloittePptxUrl={resume.deloitte_pptx_url || null}
                            cvFileName={resume.file_name || "Resume"}
                            onSuccess={(updated) => setCandidate(updated)}
                          />
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
              <h3
                className="text-base sm:text-lg font-semibold text-foreground"
                style={{ color: "#429ABD" }}
              >
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
                  <p className="text-sm text-muted-foreground">
                    No attachments found
                  </p>
                </div>
              ) : (
                candidate.attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    onClick={() => openFileViewer(attachment.file_url)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm hover:border-[#429ABD]/40 hover:bg-[#429ABD08] transition-all duration-300 gap-3 sm:gap-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="p-2 bg-[#429ABD10] text-[#429ABD] rounded-lg">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFileViewer(attachment.file_url);
                            }}
                            className="font-medium text-sm text-[#429ABD] hover:text-blue-600 hover:underline cursor-pointer text-left"
                          >
                            {attachment.file_name || attachment.filename}
                          </button>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: "#F5A62320",
                              color: "#F5A623",
                            }}
                          >
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
                    <div
                      className="flex items-center gap-2 ml-auto sm:ml-0"
                      onClick={(e) => e.stopPropagation()}
                    >
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

          <TabsContent value="requests" className="pt-2">
            <CandidateProposedRequests candidateId={id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
