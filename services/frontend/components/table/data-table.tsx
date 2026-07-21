"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  PaginationState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filter: string;
  sort: string;
  showPagination?: boolean;
  showSearch?: boolean;
  showColumns?: boolean;
  searchPlaceholder?: string;
  globalFilterValue?: string;
  onGlobalFilterChange?: (value: string) => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updaterOrValue: any) => void;
  renderBulkActions?: (table: any) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  toolbarActions?: React.ReactNode;
  manualSorting?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filter,
  sort,
  showPagination = true,
  showSearch = true,
  showColumns = true,
  searchPlaceholder = "Search...",
  globalFilterValue,
  onGlobalFilterChange,
  rowSelection = {},
  onRowSelectionChange,
  renderBulkActions,
  onRowClick,
  toolbarActions,
  manualSorting = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      created_at: true,
    });
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState(
    globalFilterValue || "",
  );
  const [isSearching, setIsSearching] = React.useState(false);
  const [loadingRowId, setLoadingRowId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (globalFilterValue !== undefined) {
      setGlobalFilter(globalFilterValue);
    }
  }, [globalFilterValue]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onGlobalFilterChange && globalFilter !== globalFilterValue) {
        setIsSearching(true);
        onGlobalFilterChange(globalFilter);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [globalFilter, onGlobalFilterChange, globalFilterValue]);

  const memoizedData = React.useMemo(() => data, [data]);
  const memoizedColumns = React.useMemo(() => columns, [columns]);

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: onRowSelectionChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
      globalFilter: onGlobalFilterChange ? "" : globalFilter,
      rowSelection,
    },
  });

  React.useEffect(() => {
    setIsSearching(false);
  }, [data]);

  return (
    <>
      {(showSearch || showColumns || renderBulkActions || toolbarActions) && (
        <div className="flex items-center  mt-2 mb-2 justify-between">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {showSearch && (
                <>
                  <div className="relative">
                    <Input
                      placeholder={searchPlaceholder}
                      value={globalFilter ?? ""}
                      onChange={(event) => setGlobalFilter(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          if (onGlobalFilterChange) {
                            setIsSearching(true);
                            onGlobalFilterChange(globalFilter);
                          }
                        }
                      }}
                      className="w-32 md:w-64 pr-8"
                    />

                    {isSearching && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                      </div>
                    )}
                  </div>

                  {globalFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGlobalFilter("");
                        onGlobalFilterChange?.("");
                      }}
                      className="h-9 border-[#429ABD] text-[#429ABD] hover:bg-[#429ABD] hover:text-white"
                    >
                      Clear
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {renderBulkActions && renderBulkActions(table)}

              {showColumns && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Columns
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        const displayName =
                          typeof column.columnDef.header === "string"
                            ? column.columnDef.header
                            : column.id;

                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {displayName}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {toolbarActions}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-neutral-200 dark:border-neutral-800">
        <Table className="w-full">
          <TableHeader className="bg-gray-100 dark:bg-neutral-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnHeader = header.column.columnDef.header;
                  const isButtonHeader = typeof columnHeader === "function";
                  const displayContent = isButtonHeader
                    ? columnHeader(header.getContext())
                    : columnHeader || sort;
                  return (
                    <TableHead
                      className={`px-4 py-1.5 whitespace-nowrap break-words text-sm font-medium ${
                        ["uploaded_at"].includes(header.column.id)
                          ? "hidden md:table-cell"
                          : "table-cell"
                      }`}
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : isButtonHeader
                          ? displayContent
                          : flexRender(displayContent, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-b border-neutral-200 dark:border-neutral-800 whitespace-nowrap transition-all
                  ${
                    loadingRowId === (row.original as any).id
                      ? "opacity-60 bg-muted pointer-events-none"
                      : "hover:bg-muted/50 dark:hover:bg-neutral-800/60"
                  }
                  ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={async () => {
                    if (!onRowClick) return;

                    const rowId = (row.original as any).id;
                    setLoadingRowId(rowId);

                    try {
                      await onRowClick(row.original);
                    } finally {
                      setLoadingRowId(null);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`px-2 md:px-4 py-1 md:py-2 font-medium truncate min-w-0 text-xs md:text-sm dark:text-neutral-50 ${
                        ["uploaded_at"].includes(cell.column.id)
                          ? "hidden md:table-cell"
                          : "table-cell"
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isSearching ? "Searching..." : "No results"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ArrowLeft />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ArrowRight />
          </Button>
        </div>
      )}
    </>
  );
}
