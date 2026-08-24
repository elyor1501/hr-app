"use client";

import { useEffect, useRef, useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoToDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso: string): string {
  const d = isoToDate(iso);
  return d ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}` : "";
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  size = "sm",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = isoToDate(value);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    if (!open) setViewDate(selected ?? new Date());
    setOpen((v) => !v);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const minDate = isoToDate(min);
  const maxDate = isoToDate(max);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const currentYear = new Date().getFullYear();
  const yearRangeStart = Math.min(2010, year);
  const yearRangeEnd = Math.max(currentYear + 5, year);
  const yearOptions: number[] = [];
  for (let y = yearRangeStart; y <= yearRangeEnd; y++) yearOptions.push(y);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = stripTime(new Date());

  function isDisabled(d: Date): boolean {
    if (minDate && d < stripTime(minDate)) return true;
    if (maxDate && d > stripTime(maxDate)) return true;
    return false;
  }

  function selectDay(d: Date) {
    if (isDisabled(d)) return;
    onChange(dateToIso(d));
    setOpen(false);
  }

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-1.5 border border-input bg-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          size === "md" ? "text-sm rounded-md px-3 py-2" : "text-sm rounded-md px-3 py-2 h-10"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {formatDate(value) || "dd.mm.yyyy"}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover text-popover-foreground shadow-md p-3">
          <div className="flex items-center justify-between mb-2 gap-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground shrink-0"
            >
              ‹
            </button>
            <span className="flex items-center gap-1 text-sm font-medium">
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                className="bg-transparent font-medium cursor-pointer appearance-none outline-none hover:text-accent-foreground"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i} className="text-foreground bg-background">{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                className="bg-transparent font-medium cursor-pointer appearance-none outline-none hover:text-accent-foreground"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="text-foreground bg-background">{y}</option>
                ))}
              </select>
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground shrink-0"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[0.8rem] font-medium text-muted-foreground text-center py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const iso = dateToIso(d);
              const isSelected = iso === value;
              const isToday = stripTime(d).getTime() === today.getTime();
              const disabled = isDisabled(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(d)}
                  className={`h-8 w-8 text-sm flex items-center justify-center rounded-md transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      : isToday
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}