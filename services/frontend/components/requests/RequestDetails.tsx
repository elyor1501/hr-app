"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRequest } from "@/lib/requests/action";
import { getRequestById } from "@/lib/requests/data";
import { EyeIcon, X, Search, UserPlus, Trash2 } from "lucide-react";
import DatePicker from "react-datepicker";
import { format, parseISO } from "date-fns";
import { useUser } from "@/app/contexts/UserContext";

type Props = {
  id: string;
  requestData: any;
  candidateData: any[];
};

export default function RequestDetails({
  id,
  requestData,
  candidateData,
}: Props) {
  const [request, setRequest] = useState<any>(requestData);
  const [candidates] = useState<any[]>(candidateData);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [proposedDateError, setProposedDateError] = useState<string>("");
  const [proposedDateValue, setProposedDateValue] = useState<string>(
    request?.proposed_date ? request.proposed_date.split("T")[0] : "",
  );
  const [feedbackDateValue, setFeedbackDateValue] = useState<string>(
    request?.feedback_date ? request.feedback_date.split("T")[0] : "",
  );
  const [contactPerson, setContactPerson] = useState(
    request?.contact_person ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    request?.contact_phone ?? "",
  );
  const [durationOfRequest, setDurationOfRequest] = useState(
    request?.duration_of_request ?? "",
  );
  const [numCandidates, setNumCandidates] = useState(
    request?.num_candidates?.toString() ?? "",
  );
  const [numProposedCandidates, setNumProposedCandidates] = useState(
    request?.num_proposed_candidates?.toString() ?? "",
  );
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [shortlistingId, setShortlistingId] = useState<string | null>(null);

  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachResults, setAttachResults] = useState<any[]>([]);
  const [attachSearching, setAttachSearching] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [proposedCandidates, setProposedCandidates] = useState<any[]>(
    requestData?.proposed_candidates || [],
  );

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const matchesRef = useRef<any[]>([]);

  const [requestedRate, setRequestedRate] = useState<string>(
    request?.prepared_rate?.toString() ?? "",
  );
  const [requestedRateType, setRequestedRateType] = useState<string>("hourly");
  const [requestedCurrency, setRequestedCurrency] = useState<string>("EUR");
  const [proposedRate, setProposedRate] = useState<string>(
    request?.final_rate?.toString() ?? "",
  );
  const [proposedRateType, setProposedRateType] = useState<string>("daily");
  const [proposedCurrency, setProposedCurrency] = useState<string>("EUR");

  const [requestNumber, setRequestNumber] = useState(
    request?.request_number ?? "",
  );
  const [requestState, setRequestState] = useState(request?.state ?? "open");
  const [requestTitle, setRequestTitle] = useState(
    request?.request_title ?? "",
  );
  const [contractStatus, setContractStatus] = useState(
    String(request?.contract_status ?? "false"),
  );
  const [companyName, setCompanyName] = useState(request?.company_name ?? "");
  const [jobDescription, setJobDescription] = useState(
    request?.job_description ?? "",
  );
  const [sapEmail, setSapEmail] = useState(request?.sap_email ?? "");
  const [sapCuser, setSapCuser] = useState(request?.sap_cuser ?? "");
  const [customerFeedback, setCustomerFeedback] = useState(
    request?.customer_feedback ?? "",
  );

  const calculateDailyRate = (
    amount: string,
    rateType: string,
  ): number | null => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;
    if (rateType === "hourly") return val * 8;
    if (rateType === "daily") return val;
    if (rateType === "weekly") return val / 5;
    if (rateType === "monthly") return val / 22;
    return null;
  };

  const requestedDailyRate = calculateDailyRate(
    requestedRate,
    requestedRateType,
  );
  const proposedDailyRate = calculateDailyRate(proposedRate, proposedRateType);

  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        ""
      : "";

  type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originalValues = useRef({
    proposedDateValue: request?.proposed_date
      ? request.proposed_date.split("T")[0]
      : "",
    requestedRate,
    requestedRateType,
    requestedCurrency,
    proposedRate,
    proposedRateType,
    proposedCurrency,
    requestNumber: request?.request_number ?? "",
    requestState: request?.state ?? "open",
    requestTitle: request?.request_title ?? "",
    contractStatus: String(request?.contract_status ?? "false"),
    companyName: request?.company_name ?? "",
    jobDescription: request?.job_description ?? "",
    sapEmail: request?.sap_email ?? "",
    sapCuser: request?.sap_cuser ?? "",
    customerFeedback: request?.customer_feedback ?? "",
    contactPerson: request?.contact_person ?? "",
    contactPhone: request?.contact_phone ?? "",
    feedbackDateValue: request?.feedback_date
      ? request.feedback_date.split("T")[0]
      : "",
    durationOfRequest: request?.duration_of_request ?? "",
    numCandidates: request?.num_candidates?.toString() ?? "",
    numProposedCandidates: request?.num_proposed_candidates?.toString() ?? "",
  });

  const { user } = useUser();
  const canEdit =
    (user as any)?.role === "admin" || (user as any)?.role === "request_editor";
  //set to true always in editing mode
  const [isEditing, setIsEditing] = useState(true);

  const isDirty = useCallback(() => {
    const o = originalValues.current;
    return (
      proposedDateValue !== o.proposedDateValue ||
      requestedRate !== o.requestedRate ||
      requestedRateType !== o.requestedRateType ||
      requestedCurrency !== o.requestedCurrency ||
      proposedRate !== o.proposedRate ||
      proposedRateType !== o.proposedRateType ||
      proposedCurrency !== o.proposedCurrency ||
      requestNumber !== o.requestNumber ||
      requestState !== o.requestState ||
      requestTitle !== o.requestTitle ||
      contractStatus !== o.contractStatus ||
      companyName !== o.companyName ||
      jobDescription !== o.jobDescription ||
      sapEmail !== o.sapEmail ||
      sapCuser !== o.sapCuser ||
      customerFeedback !== o.customerFeedback ||
      feedbackDateValue !== o.feedbackDateValue ||
      contactPerson !== o.contactPerson ||
      contactPhone !== o.contactPhone ||
      durationOfRequest !== o.durationOfRequest ||
      numCandidates !== o.numCandidates ||
      numProposedCandidates !== o.numProposedCandidates
    );
  }, [
    proposedDateValue,
    requestedRate,
    requestedRateType,
    requestedCurrency,
    proposedRate,
    proposedRateType,
    proposedCurrency,
    requestNumber,
    requestState,
    requestTitle,
    contractStatus,
    companyName,
    jobDescription,
    sapEmail,
    sapCuser,
    customerFeedback,
    contactPerson,
    contactPhone,
    feedbackDateValue,
    durationOfRequest,
    numCandidates,
    numProposedCandidates,
  ]);

  useEffect(() => {
    if (!canEdit) return;
    if (!isDirty()) {
      setAutoSaveStatus("idle");
      return;
    }
    setAutoSaveStatus("pending");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSubmit(undefined, true);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [
    proposedDateValue,
    requestedRate,
    requestedRateType,
    requestedCurrency,
    proposedRate,
    proposedRateType,
    proposedCurrency,
    requestNumber,
    requestState,
    requestTitle,
    contractStatus,
    companyName,
    jobDescription,
    sapEmail,
    sapCuser,
    customerFeedback,
    contactPerson,
    contactPhone,
    feedbackDateValue,
    durationOfRequest,
    numCandidates,
    numProposedCandidates,
    isDirty,
    canEdit,
  ]);

  function handleCancel() {
    const o = originalValues.current;
    setProposedDateValue(o.proposedDateValue);
    setRequestedRate(o.requestedRate);
    setRequestedRateType(o.requestedRateType);
    setRequestedCurrency(o.requestedCurrency);
    setProposedRate(o.proposedRate);
    setProposedRateType(o.proposedRateType);
    setProposedCurrency(o.proposedCurrency);
    setRequestNumber(o.requestNumber);
    setRequestState(o.requestState);
    setRequestTitle(o.requestTitle);
    setContractStatus(o.contractStatus);
    setCompanyName(o.companyName);
    setJobDescription(o.jobDescription);
    setSapEmail(o.sapEmail);
    setSapCuser(o.sapCuser);
    setCustomerFeedback(o.customerFeedback);
    setContactPerson(o.contactPerson);
    setContactPhone(o.contactPhone);
    setFeedbackDateValue(o.feedbackDateValue);
    setDurationOfRequest(o.durationOfRequest);
    setNumCandidates(o.numCandidates);
    setNumProposedCandidates(o.numProposedCandidates);
    setAutoSaveStatus("idle");
    setIsEditing(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const getMinProposedDate = () => {
    const today = getTodayString();
    const requestDate = request?.request_date
      ? request.request_date.split("T")[0]
      : today;
    return requestDate > today ? requestDate : today;
  };

  const validateProposedDate = (value: string): string => {
    if (!value) return "";
    const today = getTodayString();
    const requestDate = request?.request_date
      ? request.request_date.split("T")[0]
      : today;
    if (value < today) return "Proposed date cannot be in the past";
    if (value < requestDate)
      return "Proposed date cannot be before request date";
    return "";
  };

  const handleProposedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProposedDateValue(value);
    setProposedDateError(validateProposedDate(value));
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  async function searchCandidatesForAttach(query: string) {
    if (!query.trim()) {
      setAttachResults([]);
      return;
    }
    setAttachSearching(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${apiUrl}/api/v1/candidates?q=${encodeURIComponent(query)}&page=1&page_size=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = await res.json();
      setAttachResults(data.items || []);
    } catch {
    } finally {
      setAttachSearching(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCandidatesForAttach(attachSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [attachSearch]);

  useEffect(() => {
    async function fetchProposedCandidates() {
      try {
        const token = getToken();
        const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProposedCandidates(data.proposed_candidates || []);
          const ids = new Set<string>(
            (data.proposed_candidates || []).map((c: any) => c.id),
          );
          setShortlistedIds(ids);
        }
      } catch {}
    }
    fetchProposedCandidates();
  }, [id]);

  useEffect(() => {
    async function fetchCachedMatches() {
      try {
        const token = getToken();
        const res = await fetch(
          `${apiUrl}/api/v1/requests/${id}/auto-match/status`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed" && data.result?.matches) {
          const sorted = [...data.result.matches].sort(
            (a: any, b: any) => b.match_score - a.match_score,
          );
          setMatches(sorted);
          matchesRef.current = sorted;
        }
      } catch {}
    }
    fetchCachedMatches();
  }, [id]);

  async function handleAttachCandidate(candidateId: string) {
    setAttachingId(candidateId);
    try {
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}/candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to attach candidate");
        return;
      }
      const updated = await res.json();
      setProposedCandidates(updated.proposed_candidates || []);
      toast.success("Candidate attached to request");
    } catch {
      toast.error("Failed to attach candidate");
    } finally {
      setAttachingId(null);
    }
  }

  async function handleShortlist(candidateId: string) {
    setShortlistingId(candidateId);
    try {
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}/candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidate_id: candidateId,
          notes: "shortlisted",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.detail && err.detail.includes("already proposed")) {
          setShortlistedIds((prev) => new Set([...prev, candidateId]));
          toast.info("Candidate already shortlisted");
          const freshRes = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            setProposedCandidates(freshData.proposed_candidates || []);
          }
          return;
        }
        toast.error(err.detail || "Failed to shortlist candidate");
        return;
      }
      const updated = await res.json();
      setProposedCandidates(updated.proposed_candidates || []);
      setShortlistedIds((prev) => new Set([...prev, candidateId]));
      toast.success("Candidate shortlisted");
    } catch {
      toast.error("Failed to shortlist candidate");
    } finally {
      setShortlistingId(null);
    }
  }
  async function handleRemoveCandidate(candidateId: string) {
    try {
      const token = getToken();
      const res = await fetch(
        `${apiUrl}/api/v1/requests/${id}/candidates/${candidateId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        toast.error("Failed to remove candidate");
        return;
      }
      setProposedCandidates((prev) =>
        prev.filter((c: any) => c.id !== candidateId),
      );
      setShortlistedIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
      toast.success("Candidate removed from request");
    } catch {
      toast.error("Failed to remove candidate");
    }
  }

  async function pollMatchStatus() {
    try {
      const token = getToken();
      const res = await fetch(
        `${apiUrl}/api/v1/requests/${id}/auto-match/status`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.result?.matches) {
        const sorted = [...data.result.matches].sort(
          (a: any, b: any) => b.match_score - a.match_score,
        );
        setMatches(sorted);
        matchesRef.current = sorted;
      }
      if (data.status === "completed" && data.result) {
        if (pollRef.current) clearInterval(pollRef.current);
        setMatching(false);
        setMatchStatus("");
        toast.success(`Found ${data.result.total_matches} matching candidates`);
      } else if (data.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setMatching(false);
        setMatchStatus("");
        toast.error(data.message || "Matching failed");
      } else if (data.status === "processing") {
        setMatchStatus("AI validation in progress...");
      }
    } catch (e) {
      console.error("poll status error:", e);
    }
  }

  async function runCandidateMatching(forceRefresh = false) {
    setMatching(true);
    setMatchStatus("Starting matching process...");
    try {
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}/auto-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          top_k: 10,
          min_score: 0,
          auto_propose: false,
          force_refresh: forceRefresh,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      if (data.result?.matches) {
        const sorted = [...data.result.matches].sort(
          (a: any, b: any) => b.match_score - a.match_score,
        );
        setMatches(sorted);
        matchesRef.current = sorted;
      }
      if (data.status === "completed" && data.result) {
        setMatching(false);
        setMatchStatus("");
        toast.success(
          `Found ${data.result.total_matches} matching candidates (cached)`,
        );
        return;
      }
      setMatchStatus("Preliminary matches ready. AI validation running...");
      toast.info(
        "Preliminary matches loaded instantly. AI is refining results...",
      );
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollMatchStatus, 4000);
    } catch (error: any) {
      console.error("Matching error:", error);
      setMatching(false);
      setMatchStatus("");
      toast.error(error?.message || "Matching failed");
    }
  }

  async function handleSubmit(formData?: FormData, isAutoSave = false) {
    
    if (saving) return;
    setSaving(true);
    if (!isAutoSave) setAutoSaveStatus("saving");
    else setAutoSaveStatus("saving");

    try {
      let finalData = formData;
      if (!finalData) {
        const formEl = document.getElementById(
          "request-form",
        ) as HTMLFormElement;
        finalData = new FormData(formEl);
      }
      await updateRequest(finalData);
      const updatedRequest = await getRequestById(id);
      setRequest(updatedRequest);
      setProposedDateValue(
        updatedRequest?.proposed_date
          ? updatedRequest.proposed_date.split("T")[0]
          : "",
      );

      setAutoSaveStatus("saved");
      originalValues.current = {
        proposedDateValue: updatedRequest?.proposed_date
          ? updatedRequest.proposed_date.split("T")[0]
          : "",
        requestedRate,
        requestedRateType,
        requestedCurrency,
        proposedRate,
        proposedRateType,
        proposedCurrency,
        requestNumber: updatedRequest?.request_number ?? "",
        requestState: updatedRequest?.state ?? "open",
        requestTitle: updatedRequest?.request_title ?? "",
        contractStatus: String(updatedRequest?.contract_status ?? "false"),
        companyName: updatedRequest?.company_name ?? "",
        jobDescription: updatedRequest?.job_description ?? "",
        sapEmail: updatedRequest?.sap_email ?? "",
        sapCuser: updatedRequest?.sap_cuser ?? "",
        customerFeedback: updatedRequest?.customer_feedback ?? "",
        contactPerson: updatedRequest?.contact_person ?? "",
        contactPhone: updatedRequest?.contact_phone ?? "",
        feedbackDateValue: updatedRequest?.feedback_date
          ? updatedRequest.feedback_date.split("T")[0]
          : "",
        durationOfRequest: updatedRequest?.duration_of_request ?? "",
        numCandidates: updatedRequest?.num_candidates?.toString() ?? "",
        numProposedCandidates:
          updatedRequest?.num_proposed_candidates?.toString() ?? "",
      };
      setTimeout(() => setAutoSaveStatus("idle"), 3000);

      toast.success("Request updated successfully");
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.message || "Failed to update request");
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  if (!request)
    return <p className="text-muted-foreground">Loading request details...</p>;

  const fieldClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const formatDate = (date: string) => {
    if (!date) return "";
    try {
      return format(parseISO(date), "dd.MM.yyyy");
    } catch {
      const parts = date.split("T")[0].split("-");
      if (parts.length !== 3) return date;
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
  };

  const CustomHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }: any) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth();
    const startYear = new Date().getFullYear();
    const years = Array.from({ length: 20 }, (_, i) => startYear + i);

    return (
      <div className="flex items-center justify-between px-2 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        <button
          type="button"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex gap-2">
          <select
            value={currentMonth}
            onChange={({ target: { value } }) => changeMonth(parseInt(value))}
            className="text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={currentYear}
            onChange={({ target: { value } }) => changeYear(parseInt(value))}
            className="text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  };

  const sectionHeader = (title: string, color: string = "#429ABD") => (
    <h2 className="text-base sm:text-lg font-semibold" style={{ color }}>
      {title}
    </h2>
  );

  const proposedCandidateIds = new Set(
    proposedCandidates.map((c: any) => c.id),
  );
  const isSapRequest = !!request.sap_email;

  return (
    <div className="max-w-6xl mx-auto bg-card text-card-foreground rounded-xl shadow-sm border border-border p-8">
      {showAttachDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3
                className="text-base font-semibold"
                style={{ color: "#429ABD" }}
              >
                Attach Candidate to Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAttachDialog(false);
                  setAttachSearch("");
                  setAttachResults([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={attachSearch}
                onChange={(e) => setAttachSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#429ABD]"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {attachSearching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Searching...
                </p>
              )}
              {!attachSearching &&
                attachSearch &&
                attachResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No candidates found
                  </p>
                )}
              {!attachSearching &&
                attachResults.map((c: any) => {
                  const alreadyProposed = proposedCandidateIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.current_title || ""}
                          {c.email ? ` • ${c.email}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyProposed || attachingId === c.id}
                        onClick={() => handleAttachCandidate(c.id)}
                        className="px-3 py-1.5 text-xs text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        style={{
                          backgroundColor: alreadyProposed
                            ? "#94A3B8"
                            : "#429ABD",
                        }}
                        onMouseEnter={(e) => {
                          if (!alreadyProposed)
                            e.currentTarget.style.backgroundColor = "#F5A623";
                        }}
                        onMouseLeave={(e) => {
                          if (!alreadyProposed)
                            e.currentTarget.style.backgroundColor = "#429ABD";
                        }}
                      >
                        {alreadyProposed
                          ? "Attached"
                          : attachingId === c.id
                            ? "Attaching..."
                            : "Attach"}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <form
        key={request.request_date + request.proposed_date}
        id="request-form"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData, false);
        }}
        className="grid grid-cols-1 md:grid-cols-1 gap-10"
      >
        <input type="hidden" name="id" value={request.id} />
        <input
          type="hidden"
          name="request_date"
          value={request.request_date ? request.request_date.split("T")[0] : ""}
        />

        <div className="space-y-6">
          <div className="flex justify-between mb-6">
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ color: "#429ABD" }}
            >
              Request Details
            </h2>
            {/* {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:shadow-lg"
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
            )} */}
          </div>

          {isEditing && (
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-background/95 backdrop-blur shadow-sm mb-6">
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
                  onClick={() => handleSubmit(undefined, false)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-60 transition-all hover:shadow-md"
                  style={{ backgroundColor: saving ? "#F5A623" : "#429ABD" }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl border border-border">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 text-foreground">
                Company Name
              </label>
              <input
                name="company_name"
                defaultValue={request.company_name ?? ""}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Contact Person
              </label>
              <input
                name="contact_person"
                defaultValue={request.contact_person ?? ""}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contact name"
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Contact Phone
              </label>
              <input
                name="contact_phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Request Number
              </label>
              <input
                name="request_number"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value)}
                disabled={!isEditing}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Request Status
              </label>
              <select
                name="state"
                value={requestState}
                onChange={(e) => setRequestState(e.target.value)}
                disabled={!isEditing}
                className={fieldClass}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="signed">Signed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Request Title
              </label>
              <input
                name="request_title"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                disabled={!isEditing}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Contract Status
              </label>
              <select
                name="contract_status"
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
                disabled={!isEditing || requestState !== "signed"}
                className={fieldClass}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              {requestState !== "signed" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Contract can only be activated when request is signed
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 border-2 border-[#429ABD] rounded-lg p-4">
              <p className="text-sm font-semibold" style={{ color: "#429ABD" }}>
                REQUESTED RATE
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Rate Amount
                  </label>
                  <input
                    type="number"
                    name="prepared_rate"
                    value={requestedRate}
                    onChange={(e) => setRequestedRate(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Not set"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Rate Type
                  </label>
                  <select
                    name="requested_rate_type"
                    value={requestedRateType}
                    onChange={(e) => setRequestedRateType(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Currency
                  </label>
                  <select
                    name="requested_currency"
                    value={requestedCurrency}
                    onChange={(e) => setRequestedCurrency(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Daily Rate (auto)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={
                      requestedDailyRate !== null
                        ? `${requestedCurrency} ${requestedDailyRate.toFixed(2)}`
                        : "Not set"
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-2 border-[#F5A623] rounded-lg p-4">
              <p className="text-sm font-semibold" style={{ color: "#F5A623" }}>
                PROPOSED RATE
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Rate Amount
                  </label>
                  <input
                    type="number"
                    name="final_rate"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Not set"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Rate Type
                  </label>
                  <select
                    name="proposed_rate_type"
                    value={proposedRateType}
                    onChange={(e) => setProposedRateType(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Currency
                  </label>
                  <select
                    name="proposed_currency"
                    value={proposedCurrency}
                    onChange={(e) => setProposedCurrency(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">
                    Daily Rate (auto)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={
                      proposedDailyRate !== null
                        ? `${proposedCurrency} ${proposedDailyRate.toFixed(2)}`
                        : "Not set"
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Request Date
              </label>
              <input
                type="text"
                value={
                  request.request_date ? formatDate(request.request_date) : ""
                }
                disabled
                readOnly
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Proposed Date
              </label>
              <div className="custom-datepicker">
                <DatePicker
                  selected={
                    proposedDateValue ? parseISO(proposedDateValue) : null
                  }
                  onChange={(date: Date | null) => {
                    if (!date) return;
                    handleProposedDateChange({
                      target: {
                        name: "proposed_date",
                        value: format(date, "yyyy-MM-dd"),
                      },
                    } as React.ChangeEvent<HTMLInputElement>);
                  }}
                  dateFormat="dd.MM.yyyy"
                  className={fieldClass}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={15}
                  scrollableYearDropdown
                  renderCustomHeader={CustomHeader}
                  popperClassName="custom-datepicker"
                />
              </div>
              <input
                type="hidden"
                name="proposed_date"
                value={proposedDateValue}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Feedback Date
              </label>
              <div className="custom-datepicker">
                <DatePicker
                  selected={
                    feedbackDateValue ? parseISO(feedbackDateValue) : null
                  }
                  onChange={(date: Date | null) => {
                    setFeedbackDateValue(
                      date ? format(date, "yyyy-MM-dd") : "",
                    );
                  }}
                  dateFormat="dd.MM.yyyy"
                  className={fieldClass}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={15}
                  scrollableYearDropdown
                  renderCustomHeader={CustomHeader}
                  popperClassName="custom-datepicker"
                />
              </div>
              <input
                type="hidden"
                name="feedback_date"
                value={feedbackDateValue}
                onChange={(e) => setFeedbackDateValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Duration of Request
              </label>
              <input
                name="duration_of_request"
                defaultValue={request.duration_of_request ?? ""}
                onChange={(e) => setDurationOfRequest(e.target.value)}
                placeholder="e.g. 6 months"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Number of Candidates
              </label>
              <input
                type="number"
                name="num_candidates"
                defaultValue={request.num_candidates ?? ""}
                onChange={(e) => setNumCandidates(e.target.value)}
                placeholder="0"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Number of Proposed Candidates
              </label>
              <input
                type="number"
                name="num_proposed_candidates"
                defaultValue={request.num_proposed_candidates ?? ""}
                onChange={(e) => setNumProposedCandidates(e.target.value)}
                placeholder="0"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Job Description
            </label>
            <textarea
              name="job_description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>

          {sectionHeader("SAP Customer Details")}
          {(request.sap_email || isEditing) && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  SAP Email
                </label>
                <input
                  name="sap_email"
                  type="email"
                  value={sapEmail}
                  onChange={(e) => setSapEmail(e.target.value)}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">
                  SAP C-User ID
                </label>
                <input
                  name="sap_cuser"
                  value={sapCuser}
                  onChange={(e) => setSapCuser(e.target.value)}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Customer Feedback
            </label>
            <textarea
              name="customer_feedback"
              value={customerFeedback}
              onChange={(e) => setCustomerFeedback(e.target.value)}
              rows={3}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
        </div>
      </form>

      {proposedCandidates.length > 0 && (
        <div className="mt-8">
          {sectionHeader(
            `Attached Candidates (${proposedCandidates.length})`,
            "#429ABD",
          )}
          <div className="grid gap-3 mt-3">
            {proposedCandidates.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.current_title || ""}
                    {c.email ? ` • ${c.email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/candidates/${c.id}`)}
                    className="px-2 py-1 text-xs text-white rounded-lg transition-all duration-300"
                    style={{ backgroundColor: "#429ABD" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#F5A623")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#429ABD")
                    }
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveCandidate(c.id)}
                    className="px-2 py-1 text-xs text-white rounded-lg transition-all duration-300"
                    style={{ backgroundColor: "#EF4444" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#B91C1C")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#EF4444")
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          {sectionHeader(`Matching Candidates (${matches.length})`, "#F5A623")}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAttachDialog(true)}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg flex items-center gap-2"
              style={{ backgroundColor: "#429ABD" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#F5A623")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#429ABD")
              }
            >
              <UserPlus className="w-4 h-4" />
              Attach Manually
            </button>
            <button
              onClick={() => runCandidateMatching(false)}
              disabled={matching}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: matching ? "#94A3B8" : "#429ABD" }}
              onMouseEnter={(e) => {
                if (!matching)
                  e.currentTarget.style.backgroundColor = "#F5A623";
              }}
              onMouseLeave={(e) => {
                if (!matching)
                  e.currentTarget.style.backgroundColor = "#429ABD";
              }}
            >
              {matching ? "Matching..." : "Find Matching Candidates"}
            </button>
            {matches.length > 0 && (
              <button
                onClick={() => runCandidateMatching(true)}
                disabled={matching}
                className="px-3 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: "#429ABD" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#F5A623")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#429ABD")
                }
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {matching && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {matchStatus || "Matching in progress..."}
            </p>
          </div>
        )}

        {matches.length === 0 && !matching ? (
          <p className="text-muted-foreground">
            No matching candidates found. Click the button above.
          </p>
        ) : (
          <div className="grid gap-4">
            {matches.map((candidate) => {
              const isShortlisted =
                shortlistedIds.has(candidate.candidate_id) ||
                proposedCandidateIds.has(candidate.candidate_id);

              return (
                <div
                  key={candidate.candidate_id}
                  className="border border-border rounded-lg p-5 shadow-sm space-y-3 bg-card"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {candidate.first_name} {candidate.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.current_title || "N/A"}
                        {candidate.current_company
                          ? ` @ ${candidate.current_company}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.location || ""}
                        {candidate.email ? ` • ${candidate.email}` : ""}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        candidate.match_score >= 70
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : candidate.match_score >= 40
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {candidate.match_score}% Match
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {candidate.reasoning}
                  </p>

                  {candidate.strengths && candidate.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                        Strengths
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {candidate.strengths.map((s: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {candidate.gaps && candidate.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                        Gaps
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {candidate.gaps.map((g: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {candidate.skills_comparison && (
                    <div className="grid grid-cols-2 gap-3">
                      {candidate.skills_comparison.matching_skills?.length >
                        0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                            Matching Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills_comparison.matching_skills.map(
                              (skill: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {candidate.skills_comparison.candidate_skills?.length >
                        0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Candidate Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills_comparison.candidate_skills
                              .slice(0, 10)
                              .map((skill: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {candidate.hourly_rate && (
                    <p className="text-xs text-muted-foreground">
                      Rate: €{candidate.hourly_rate}/hr
                    </p>
                  )}

                  {isSapRequest && candidate.sap_secure_id && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-foreground">
                        SAP Secure ID:
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-mono font-bold rounded"
                        style={{
                          backgroundColor: "#429ABD20",
                          color: "#429ABD",
                        }}
                      >
                        {candidate.sap_secure_id}
                      </span>
                    </div>
                  )}
                  {isSapRequest && !candidate.sap_secure_id && (
                    <p className="text-xs text-orange-500 mt-1">
                      SAP Secure ID: Incomplete (DOB or SSN missing)
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    {/* <button
                      type="button"
                      disabled={
                        isShortlisted ||
                        shortlistingId === candidate.candidate_id
                      }
                      onClick={() => handleShortlist(candidate.candidate_id)}
                      className="px-4 py-1.5 text-sm text-white rounded-md transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isShortlisted ? "#94A3B8" : "#F5A623",
                      }}
                      onMouseEnter={(e) => {
                        if (!isShortlisted)
                          e.currentTarget.style.backgroundColor = "#d48e1a";
                      }}
                      onMouseLeave={(e) => {
                        if (!isShortlisted)
                          e.currentTarget.style.backgroundColor = "#F5A623";
                      }}
                    >
                      {isShortlisted
                        ? "Shortlisted"
                        : shortlistingId === candidate.candidate_id
                          ? "Shortlisting..."
                          : "Shortlist"}
                    </button> */}
                    <button
                      onClick={() =>
                        router.push(`/candidates/${candidate.candidate_id}`)
                      }
                      className="px-4 py-1.5 text-sm text-white rounded-md transition-all duration-300 hover:shadow-lg"
                      style={{ backgroundColor: "#429ABD" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
