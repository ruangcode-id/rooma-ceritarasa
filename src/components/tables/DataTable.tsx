"use client";

import { useMemo, useState } from "react";
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";

export type DataTableColumn<TData> = {
  id: string;
  header: React.ReactNode;
  accessor?: keyof TData | ((row: TData, index: number) => React.ReactNode);
  cell?: (row: TData, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<TData> = {
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  rowKey: keyof TData | ((row: TData, index: number) => React.Key);
  initialPageSize?: number;
  pageSizeOptions?: number[];
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingState?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPageChange: (page: number) => void;
  };
  caption?: string;
  className?: string;
  tableClassName?: string;
};

function getCellValue<TData>(
  column: DataTableColumn<TData>,
  row: TData,
  index: number
) {
  if (column.cell) return column.cell(row, index);
  if (typeof column.accessor === "function") return column.accessor(row, index);
  if (column.accessor) return row[column.accessor] as React.ReactNode;
  return null;
}

function getRowKey<TData>(
  rowKey: DataTableProps<TData>["rowKey"],
  row: TData,
  index: number
) {
  if (typeof rowKey === "function") return rowKey(row, index);
  return row[rowKey] as React.Key;
}

export function DataTable<TData>({
  columns,
  data,
  rowKey,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyState = "Belum ada data.",
  loading = false,
  loadingState = "Memuat data...",
  pagination,
  caption,
  className = "",
  tableClassName = "min-w-[720px]",
}: DataTableProps<TData>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = pagination?.total ?? data.length;
  const activePageSize = pagination?.pageSize ?? pageSize;
  const totalPages = Math.max(
    1,
    pagination?.totalPages ?? Math.ceil(data.length / pageSize)
  );
  const currentPage = Math.min(pagination?.page ?? page, totalPages);
  const startIndex = (currentPage - 1) * activePageSize;
  const endIndex = pagination
    ? Math.min(startIndex + data.length, total)
    : Math.min(startIndex + pageSize, data.length);

  const visibleRows = useMemo(
    () => (pagination ? data : data.slice(startIndex, endIndex)),
    [data, endIndex, pagination, startIndex]
  );

  const canGoBack = pagination?.hasPrev ?? currentPage > 1;
  const canGoForward = pagination?.hasNext ?? currentPage < totalPages;

  function changePage(nextPage: number) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);

    if (pagination) {
      pagination.onPageChange(safePage);
      return;
    }

    setPage(safePage);
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${tableClassName}`}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.15em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${column.headerClassName ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {loadingState}
                </td>
              </tr>
            ) : visibleRows.length > 0 ? (
              visibleRows.map((row, rowIndex) => {
                const absoluteIndex = startIndex + rowIndex;

                return (
                  <tr
                    key={getRowKey(rowKey, row, absoluteIndex)}
                    className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-4 py-4 text-slate-700 ${column.className ?? ""}`}
                      >
                        {getCellValue(column, row, absoluteIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            {total > 0 ? startIndex + 1 : 0}-{endIndex} dari {total}
          </span>
          {!pagination ? (
            <label className="inline-flex items-center gap-2">
              <span className="text-slate-500">Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-primary/30"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <PaginationButton
            label="Halaman pertama"
            disabled={!canGoBack || loading}
            onClick={() => changePage(1)}
            Icon={CaretDoubleLeft}
          />
          <PaginationButton
            label="Halaman sebelumnya"
            disabled={!canGoBack || loading}
            onClick={() => changePage(currentPage - 1)}
            Icon={CaretLeft}
          />
          <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <PaginationButton
            label="Halaman berikutnya"
            disabled={!canGoForward || loading}
            onClick={() => changePage(currentPage + 1)}
            Icon={CaretRight}
          />
          <PaginationButton
            label="Halaman terakhir"
            disabled={!canGoForward || loading}
            onClick={() => changePage(totalPages)}
            Icon={CaretDoubleRight}
          />
        </div>
      </div>
    </section>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  Icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: number; weight?: "regular" | "bold" }>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={16} weight="bold" />
    </button>
  );
}
