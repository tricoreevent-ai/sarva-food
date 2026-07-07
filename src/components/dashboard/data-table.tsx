"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type AdvancedColumn<T> = {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
};

export function AdvancedDataTable<T extends object>({
  title,
  columns,
  rows,
  pageSize = 8,
  searchPlaceholder = "Search rows",
  exportFilename,
}: {
  title: string;
  columns: AdvancedColumn<T>[];
  rows: T[];
  pageSize?: number;
  searchPlaceholder?: string;
  exportFilename?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const searchableColumns = useMemo(() => columns.filter((column) => column.searchable !== false), [columns]);
  const filteredRows = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const filtered = normalized
      ? rows.filter((row) =>
          searchableColumns.some((column) =>
            String(column.exportValue ? column.exportValue(row) : row[column.key as keyof T] ?? "").toLowerCase().includes(normalized),
          ),
        )
      : rows;

    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey as keyof T];
      const bValue = b[sortKey as keyof T];
      const modifier = sortDirection === "asc" ? 1 : -1;
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * modifier;
      }
      return String(aValue ?? "").localeCompare(String(bValue ?? "")) * modifier;
    });
  }, [deferredQuery, rows, searchableColumns, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function updateSort(column: AdvancedColumn<T>) {
    if (column.sortable === false) return;
    if (sortKey === column.key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column.key);
    setSortDirection("asc");
  }

  function exportCsv() {
    const csvRows = [
      columns.map((column) => escapeCsv(column.label)).join(","),
      ...filteredRows.map((row) =>
        columns.map((column) => escapeCsv(String(column.exportValue ? column.exportValue(row) : row[column.key as keyof T] ?? ""))).join(","),
      ),
    ];
    const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows.join("\n"))}`;
    const link = document.createElement("a");
    link.href = href;
    link.download = exportFilename ?? `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{filteredRows.length} rows</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="h-10 min-w-60 pl-9"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
          </label>
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>
      <div className="render-contain max-h-[520px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn(column.align === "right" && "text-right", column.align === "center" && "text-center")}>
                  <button
                    type="button"
                    className={cn("inline-flex items-center gap-1 font-black", column.sortable === false && "cursor-default")}
                    onClick={() => updateSort(column)}
                  >
                    {column.label}
                    {column.sortable === false ? null : <ArrowDownUp className="size-3" />}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row, index) => (
              <TableRow key={String((row as { id?: unknown }).id ?? index)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn(column.align === "right" && "text-right", column.align === "center" && "text-center")}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!visibleRows.length ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                  No matching records.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-muted-foreground">Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function SimpleDataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, string>[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row[columns[0]]}-${index}`}>
            {columns.map((column) => {
              const value = row[column] ?? "";
              const isStatus = /status|level|plan|role/i.test(column);

              return (
                <TableCell key={column}>
                  {isStatus ? <Badge variant="muted">{value}</Badge> : value}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
