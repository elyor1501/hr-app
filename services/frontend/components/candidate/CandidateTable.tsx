"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Search,
  X,
} from "lucide-react";
import { getCandidates } from "@/lib/candidates/data";

interface FilterPanelProps {
  anchorRect: DOMRect | null;
  title: string;
  searchText: string;
  onSearchChange: (v: string) => void;
  items: string[];
  selectedItems: string[];
  onToggleItem: (item: string) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}

function FilterPanel({
  anchorRect,
  title,
  searchText,
  onSearchChange,
  items,
  selectedItems,
  onToggleItem,
  onReset,
  onApply,
  onClose,
}: FilterPanelProps) {
  if (!anchorRect || typeof document === "undefined") return null;

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: anchorRect.bottom + 8,
    left: anchorRect.left,
    zIndex: 99999,
    width: 264,
  };

  const filtered = items.filter((item) =>
    item.toLowerCase().includes(searchText.toLowerCase()),
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: 99998 }}
        onClick={onClose}
      />
      <div
        style={panelStyle}
        className="bg-card border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-3 text-left font-normal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-border/60">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-background border-border/80 w-full"
            autoFocus
          />
        </div>
        {filtered.length > 0 && (
          <div className="flex gap-2 text-[11px] text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground underline"
              onClick={() => {
                filtered.forEach((item) => {
                  if (!selectedItems.includes(item)) onToggleItem(item);
                });
              }}
            >
              Select all
            </button>
            <span>·</span>
            <button
              type="button"
              className="hover:text-foreground underline"
              onClick={onReset}
            >
              Clear
            </button>
          </div>
        )}
        <div className="max-h-40 overflow-y-auto border border-border/60 rounded-lg p-1.5 flex flex-col gap-0.5 bg-background">
          {filtered.length === 0 ? (
            <span className="text-[11px] text-muted-foreground p-1 text-center">
              No results
            </span>
          ) : (
            filtered.map((item) => {
              const isChecked = selectedItems.includes(item);
              return (
                <label
                  key={item}
                  className="flex items-center gap-2 p-1 rounded hover:bg-muted/60 cursor-pointer text-xs text-foreground select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleItem(item)}
                    className="rounded border-border accent-blue-600 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="truncate">{item}</span>
                </label>
              );
            })
          )}
        </div>
        <div className="flex gap-2 justify-end border-border/60">
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs">
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            className="h-7 px-3 text-xs text-white"
            style={{ backgroundColor: "#429ABD" }}
          >
            Apply
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function parseSearchDate(value: string): { dateFrom: string; dateTo: string } | null {
  const ddmmyyyy = value.match(/^(\d{2})[.\-\/](\d{2})[.\-\/](\d{4})$/);
  if (ddmmyyyy) {
    const formatted = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    return { dateFrom: formatted, dateTo: formatted };
  }
  const yyyymmdd = value.match(/^(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})$/);
  if (yyyymmdd) {
    const formatted = `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
    return { dateFrom: formatted, dateTo: formatted };
  }
  return null;
}

export default function CandidatesTable({
  data,
  resumes,
}: {
  data: any[];
  resumes: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");

  const [q, setQ] = useState(
    searchParams.get("q") ||
      (searchParams.get("dateFrom")
        ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
        : ""),
  );

  const parseMulti = (val: string | null) =>
    val ? val.split("|").map((v) => v.trim()).filter(Boolean) : [];

  const [selectedNames, setSelectedNames] = useState<string[]>(parseMulti(searchParams.get("name")));
  const [selectedRoles, setSelectedRoles] = useState<string[]>(parseMulti(searchParams.get("jobTitle")));
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(parseMulti(searchParams.get("currentCompany")));
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(parseMulti(searchParams.get("candidateStatus")));

  const [activeFilter, setActiveFilter] = useState<"name" | "role" | "company" | "status" | null>(null);
  const [nameAnchorRect, setNameAnchorRect] = useState<DOMRect | null>(null);
  const [roleAnchorRect, setRoleAnchorRect] = useState<DOMRect | null>(null);
  const [companyAnchorRect, setCompanyAnchorRect] = useState<DOMRect | null>(null);
  const [statusAnchorRect, setStatusAnchorRect] = useState<DOMRect | null>(null);

  const [nameSearchText, setNameSearchText] = useState("");
  const [roleSearchText, setRoleSearchText] = useState("");
  const [companySearchText, setCompanySearchText] = useState("");
  const [statusSearchText, setStatusSearchText] = useState("");

  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<string[]>([]);
  const [pendingStatuses, setPendingStatuses] = useState<string[]>([]);

  const [allCandidates, setAllCandidates] = useState<any[]>([]);

  const applySort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy !== field) {
      params.set("sortBy", field);
      params.set("sortOrder", "asc");
    } else if (sortOrder === "asc") {
      params.set("sortOrder", "desc");
    } else {
      params.delete("sortBy");
      params.delete("sortOrder");
    }
    params.set("page", "1");
    router.push(`/candidates?${params.toString()}`);
  };

  useEffect(() => {
    setQ(
      searchParams.get("q") ||
        (searchParams.get("dateFrom")
          ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
          : ""),
    );
    setSelectedNames(parseMulti(searchParams.get("name")));
    setSelectedRoles(parseMulti(searchParams.get("jobTitle")));
    setSelectedCompanies(parseMulti(searchParams.get("currentCompany")));
    setSelectedStatuses(parseMulti(searchParams.get("candidateStatus")));
  }, [searchParams]);

  useEffect(() => {
    if (activeFilter === "name") setPendingNames([...selectedNames]);
    if (activeFilter === "role") setPendingRoles([...selectedRoles]);
    if (activeFilter === "company") setPendingCompanies([...selectedCompanies]);
    if (activeFilter === "status") setPendingStatuses([...selectedStatuses]);
  }, [activeFilter]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const result = await getCandidates(1, 100);
        if (result?.items) setAllCandidates(result.items);
      } catch (e) {
        console.error("Error fetching candidates for filters:", e);
      }
    }
    fetchAll();
  }, []);

  const uniqueNames = useMemo(() => {
    const src = allCandidates.length > 0 ? allCandidates : data;
    const names = src.map((item: any) => `${item.first_name || ""} ${item.last_name || ""}`.trim()).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [allCandidates, data]);

  const uniqueRoles = useMemo(() => {
    const src = allCandidates.length > 0 ? allCandidates : data;
    return Array.from(new Set(src.map((item: any) => item.current_title).filter(Boolean))).sort();
  }, [allCandidates, data]);

  const uniqueCompanies = useMemo(() => {
    const src = allCandidates.length > 0 ? allCandidates : data;
    return Array.from(new Set(src.map((item: any) => item.current_company).filter(Boolean))).sort();
  }, [allCandidates, data]);

  const uniqueStatuses = ["active", "inactive"];

  const applySearch = useCallback(
    (qVal: string, names: string[], roles: string[], companies: string[], statuses: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      params.delete("q");
      params.delete("dateFrom");
      params.delete("dateTo");

      if (qVal.trim()) {
        const dateResult = parseSearchDate(qVal.trim());
        if (dateResult) {
          params.set("dateFrom", dateResult.dateFrom);
          params.set("dateTo", dateResult.dateTo);
        } else {
          params.set("q", qVal.trim());
        }
      }

      names.length > 0 ? params.set("name", names.join("|")) : params.delete("name");
      roles.length > 0 ? params.set("jobTitle", roles.join("|")) : params.delete("jobTitle");
      companies.length > 0 ? params.set("currentCompany", companies.join("|")) : params.delete("currentCompany");
      statuses.length > 0 ? params.set("candidateStatus", statuses[0]) : params.delete("candidateStatus");

      router.push(`/candidates?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleClear = () => {
    setQ("");
    setSelectedNames([]);
    setSelectedRoles([]);
    setSelectedCompanies([]);
    setSelectedStatuses([]);
    setActiveFilter(null);
    router.push("/candidates");
  };

  const hasAnyFilter =
    selectedNames.length > 0 ||
    selectedRoles.length > 0 ||
    selectedCompanies.length > 0 ||
    selectedStatuses.length > 0;

  const columns = useMemo(() => {
    return columns_candidate_list.map((col: any) => {
      if (col.accessorKey === "first_name") {
        return {
          ...col,
          header: ({ column }: any) => (
            <div className="flex items-center justify-between gap-2 py-1">
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-0 hover:bg-transparent"
                onClick={() => applySort("first_name")}
              >
                <span>Name and Email</span>
                {sortBy === "first_name" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : sortOrder === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNameAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setActiveFilter((prev) => (prev === "name" ? null : "name"));
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-0.5 flex-shrink-0 ${
                  selectedNames.length > 0 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedNames.length > 0 && (
                  <span className="text-[10px] font-bold leading-none">{selectedNames.length}</span>
                )}
              </button>
            </div>
          ),
        };
      }

      if (col.accessorKey === "current_title") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-between gap-2 py-1">
              <span>Role</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRoleAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setActiveFilter((prev) => (prev === "role" ? null : "role"));
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-0.5 flex-shrink-0 ${
                  selectedRoles.length > 0 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedRoles.length > 0 && (
                  <span className="text-[10px] font-bold leading-none">{selectedRoles.length}</span>
                )}
              </button>
            </div>
          ),
        };
      }

      if (col.accessorKey === "current_company") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-between gap-2 py-1">
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-0 hover:bg-transparent"
                onClick={() => applySort("current_company")}
              >
                <span>Company</span>
                {sortBy === "current_company" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : sortOrder === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompanyAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setActiveFilter((prev) => (prev === "company" ? null : "company"));
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-0.5 flex-shrink-0 ${
                  selectedCompanies.length > 0 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedCompanies.length > 0 && (
                  <span className="text-[10px] font-bold leading-none">{selectedCompanies.length}</span>
                )}
              </button>
            </div>
          ),
        };
      }

      if (col.accessorKey === "status") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-between gap-2 py-1">
              <span>Status</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                  setActiveFilter((prev) => (prev === "status" ? null : "status"));
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-0.5 flex-shrink-0 ${
                  selectedStatuses.length > 0 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                {selectedStatuses.length > 0 && (
                  <span className="text-[10px] font-bold leading-none">{selectedStatuses.length}</span>
                )}
              </button>
            </div>
          ),
        };
      }

      return col;
    });
  }, [selectedNames, selectedRoles, selectedCompanies, selectedStatuses, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center mt-4 gap-2">
          {selectedNames.map((n) => (
            <span key={n} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1">
              {n}
              <button type="button" onClick={() => { const next = selectedNames.filter((x) => x !== n); setSelectedNames(next); applySearch(q, next, selectedRoles, selectedCompanies, selectedStatuses); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedRoles.map((r) => (
            <span key={r} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1">
              {r}
              <button type="button" onClick={() => { const next = selectedRoles.filter((x) => x !== r); setSelectedRoles(next); applySearch(q, selectedNames, next, selectedCompanies, selectedStatuses); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedCompanies.map((c) => (
            <span key={c} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1">
              {c}
              <button type="button" onClick={() => { const next = selectedCompanies.filter((x) => x !== c); setSelectedCompanies(next); applySearch(q, selectedNames, selectedRoles, next, selectedStatuses); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedStatuses.map((s) => (
            <span key={s} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1">
              {s}
              <button type="button" onClick={() => { const next = selectedStatuses.filter((x) => x !== s); setSelectedStatuses(next); applySearch(q, selectedNames, selectedRoles, selectedCompanies, next); }}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-7 px-2 ml-auto">
            Clear All
          </Button>
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        <DataTable
          columns={columns}
          data={data}
          filter={""}
          sort={""}
          manualSorting={true}
          showPagination={false}
          showSearch={true}
          globalFilterValue={q}
          onGlobalFilterChange={(value) => {
            setQ(value);
            applySearch(value, selectedNames, selectedRoles, selectedCompanies, selectedStatuses);
          }}
          searchPlaceholder="Search candidates..."
          onRowClick={(row: any) => {
            router.push(`/candidates/${row.id}`);
          }}
        />
      </div>

      {activeFilter === "name" && (
        <FilterPanel
          anchorRect={nameAnchorRect}
          title="Filter by Name"
          searchText={nameSearchText}
          onSearchChange={setNameSearchText}
          items={uniqueNames}
          selectedItems={pendingNames}
          onToggleItem={(item) => setPendingNames((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])}
          onReset={() => { setPendingNames([]); setNameSearchText(""); }}
          onApply={() => { setSelectedNames(pendingNames); applySearch(q, pendingNames, selectedRoles, selectedCompanies, selectedStatuses); setActiveFilter(null); setNameSearchText(""); }}
          onClose={() => { setActiveFilter(null); setNameSearchText(""); }}
        />
      )}

      {activeFilter === "role" && (
        <FilterPanel
          anchorRect={roleAnchorRect}
          title="Filter by Role"
          searchText={roleSearchText}
          onSearchChange={setRoleSearchText}
          items={uniqueRoles}
          selectedItems={pendingRoles}
          onToggleItem={(item) => setPendingRoles((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])}
          onReset={() => { setPendingRoles([]); setRoleSearchText(""); }}
          onApply={() => { setSelectedRoles(pendingRoles); applySearch(q, selectedNames, pendingRoles, selectedCompanies, selectedStatuses); setActiveFilter(null); setRoleSearchText(""); }}
          onClose={() => { setActiveFilter(null); setRoleSearchText(""); }}
        />
      )}

      {activeFilter === "company" && (
        <FilterPanel
          anchorRect={companyAnchorRect}
          title="Filter by Company"
          searchText={companySearchText}
          onSearchChange={setCompanySearchText}
          items={uniqueCompanies}
          selectedItems={pendingCompanies}
          onToggleItem={(item) => setPendingCompanies((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])}
          onReset={() => { setPendingCompanies([]); setCompanySearchText(""); }}
          onApply={() => { setSelectedCompanies(pendingCompanies); applySearch(q, selectedNames, selectedRoles, pendingCompanies, selectedStatuses); setActiveFilter(null); setCompanySearchText(""); }}
          onClose={() => { setActiveFilter(null); setCompanySearchText(""); }}
        />
      )}

      {activeFilter === "status" && (
        <FilterPanel
          anchorRect={statusAnchorRect}
          title="Filter by Status"
          searchText={statusSearchText}
          onSearchChange={setStatusSearchText}
          items={uniqueStatuses}
          selectedItems={pendingStatuses}
          onToggleItem={(item) => setPendingStatuses((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item])}
          onReset={() => { setPendingStatuses([]); setStatusSearchText(""); }}
          onApply={() => { setSelectedStatuses(pendingStatuses); applySearch(q, selectedNames, selectedRoles, selectedCompanies, pendingStatuses); setActiveFilter(null); setStatusSearchText(""); }}
          onClose={() => { setActiveFilter(null); setStatusSearchText(""); }}
        />
      )}
    </div>
  );
}