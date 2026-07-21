"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { DataTable } from "@/components/table/data-table";
import { columns_request_list } from "../requests/RequestListTableColumn";
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
import { ImportJobButton } from "./ImportJobButton";

export const dynamic = "force-dynamic";

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
        className="bg-card border border-border shadow-2xl rounded-xl p-3.5 flex flex-col gap-3 text-left font-normal"
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
            placeholder={`Search...`}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 px-2 text-xs"
          >
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

function parseSearchDate(
  value: string,
): { dateFrom: string; dateTo: string } | null {
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

export default function RequestTable({ data }: { data: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sortBy") || "";
  const sortOrder = searchParams.get("sortOrder") || "";

  const [q, setQ] = useState(
    searchParams.get("q") ||
      (searchParams.get("dateFrom")
        ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
        : ""),
  );

  const parseMulti = (val: string | null) =>
    val
      ? val
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const [selectedRequestNumbers, setSelectedRequestNumbers] = useState<
    string[]
  >(parseMulti(searchParams.get("requestNumber")));

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    parseMulti(searchParams.get("company")),
  );

  const [activeFilter, setActiveFilter] = useState<
    "requestNumber" | "company" | null
  >(null);

  const [requestAnchorRect, setRequestAnchorRect] = useState<DOMRect | null>(
    null,
  );

  const [companyAnchorRect, setCompanyAnchorRect] = useState<DOMRect | null>(
    null,
  );

  const [requestSearchText, setRequestSearchText] = useState("");
  const [companySearchText, setCompanySearchText] = useState("");

  const [pendingRequestNumbers, setPendingRequestNumbers] = useState<string[]>(
    [],
  );

  const [pendingCompanies, setPendingCompanies] = useState<string[]>([]);

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

    router.push(`/requests?${params.toString()}`);
  };

  useEffect(() => {
    setQ(
      searchParams.get("q") ||
        (searchParams.get("dateFrom")
          ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
          : ""),
    );
    setSelectedRequestNumbers(parseMulti(searchParams.get("requestNumber")));
    setSelectedCompanies(parseMulti(searchParams.get("company")));
  }, [searchParams]);

  useEffect(() => {
    if (activeFilter === "requestNumber")
      setPendingRequestNumbers([...selectedRequestNumbers]);

    if (activeFilter === "company") setPendingCompanies([...selectedCompanies]);
  }, [activeFilter]);

  const uniqueRequestNumbers = useMemo(() => {
    const values = data.map((item: any) => item.request_number).filter(Boolean);

    return Array.from(new Set(values)).sort();
  }, [data]);

  const uniqueCompanies = useMemo(() => {
    const values = data.map((item: any) => item.company_name).filter(Boolean);

    return Array.from(new Set(values)).sort();
  }, [data]);

  const applySearch = useCallback(
    (qVal: string, requestNumbers: string[], companies: string[]) => {
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

      requestNumbers.length > 0
        ? params.set("requestNumber", requestNumbers.join("|"))
        : params.delete("requestNumber");

      companies.length > 0
        ? params.set("company", companies.join("|"))
        : params.delete("company");

      router.push(`/requests?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleClear = () => {
    setQ("");
    setSelectedRequestNumbers([]);
    setSelectedCompanies([]);
    setActiveFilter(null);
    router.push("/requests");
  };

  const hasAnyFilter =
    selectedRequestNumbers.length > 0 || selectedCompanies.length > 0;

  const columns = useMemo(() => {
    return columns_request_list.map((col: any) => {
      if (col.accessorKey === "request_number") {
        return {
          ...col,
          header: () => (
            <div className="min-w-[160px] flex items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-1 px-0">
                <span>Request No</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRequestAnchorRect(
                    (
                      e.currentTarget as HTMLButtonElement
                    ).getBoundingClientRect(),
                  );
                  setActiveFilter((prev) =>
                    prev === "requestNumber" ? null : "requestNumber",
                  );
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 flex items-center gap-0.5 ${
                  selectedRequestNumbers.length
                    ? "text-blue-600 bg-blue-50"
                    : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3 h-3" />
                {selectedRequestNumbers.length > 0 && (
                  <span className="text-[10px] font-bold">
                    {selectedRequestNumbers.length}
                  </span>
                )}
              </button>
            </div>
          ),
        };
      }

      if (col.accessorKey === "company_name") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-between gap-2 py-1">
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-0 hover:bg-transparent"
                onClick={() => applySort("company_name")}
              >
                <span>Company</span>
                {sortBy === "company_name" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-[#429ABD]" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCompanyAnchorRect(
                    (
                      e.currentTarget as HTMLButtonElement
                    ).getBoundingClientRect(),
                  );
                  setActiveFilter((prev) =>
                    prev === "company" ? null : "company",
                  );
                }}
                className={`p-1.5 rounded-lg hover:bg-muted/80 flex items-center gap-0.5 ${
                  selectedCompanies.length
                    ? "text-blue-600 bg-blue-50"
                    : "text-muted-foreground"
                }`}
              >
                <Filter className="w-3 h-3" />
                {selectedCompanies.length > 0 && (
                  <span className="text-[10px] font-bold">
                    {selectedCompanies.length}
                  </span>
                )}
              </button>
            </div>
          ),
        };
      }

      return col;
    });
  }, [selectedRequestNumbers, selectedCompanies, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center mt-4 gap-2">
          {selectedRequestNumbers.map((requestNo) => (
            <span
              key={requestNo}
              className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1"
            >
              {requestNo}
              <button
                type="button"
                onClick={() => {
                  const next = selectedRequestNumbers.filter(
                    (x) => x !== requestNo,
                  );
                  setSelectedRequestNumbers(next);
                  applySearch(q, next, selectedCompanies);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {selectedCompanies.map((company) => (
            <span
              key={company}
              className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full px-2.5 py-1"
            >
              {company}
              <button
                type="button"
                onClick={() => {
                  const next = selectedCompanies.filter((x) => x !== company);
                  setSelectedCompanies(next);
                  applySearch(q, selectedRequestNumbers, next);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs h-7 px-2 ml-auto"
          >
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
          toolbarActions={
            <>
              <ImportJobButton />
            </>
          }
          globalFilterValue={q}
          onGlobalFilterChange={(value) => {
            setQ(value);
            applySearch(value, selectedRequestNumbers, selectedCompanies);
          }}
          searchPlaceholder="Search requests..."
          onRowClick={(row: any) => {
            router.push(`/requests/${row.id}`);
          }}
        />
      </div>

      {activeFilter === "requestNumber" && (
        <FilterPanel
          anchorRect={requestAnchorRect}
          title="Filter by Request Number"
          searchText={requestSearchText}
          onSearchChange={setRequestSearchText}
          items={uniqueRequestNumbers}
          selectedItems={pendingRequestNumbers}
          onToggleItem={(item) =>
            setPendingRequestNumbers((prev) =>
              prev.includes(item)
                ? prev.filter((x) => x !== item)
                : [...prev, item],
            )
          }
          onReset={() => {
            setPendingRequestNumbers([]);
            setRequestSearchText("");
          }}
          onApply={() => {
            setSelectedRequestNumbers(pendingRequestNumbers);
            applySearch(q, pendingRequestNumbers, selectedCompanies);
            setActiveFilter(null);
            setRequestSearchText("");
          }}
          onClose={() => {
            setActiveFilter(null);
            setRequestSearchText("");
          }}
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
          onToggleItem={(item) =>
            setPendingCompanies((prev) =>
              prev.includes(item)
                ? prev.filter((x) => x !== item)
                : [...prev, item],
            )
          }
          onReset={() => {
            setPendingCompanies([]);
            setCompanySearchText("");
          }}
          onApply={() => {
            setSelectedCompanies(pendingCompanies);
            applySearch(q, selectedRequestNumbers, pendingCompanies);
            setActiveFilter(null);
            setCompanySearchText("");
          }}
          onClose={() => {
            setActiveFilter(null);
            setCompanySearchText("");
          }}
        />
      )}
    </div>
  );
}
