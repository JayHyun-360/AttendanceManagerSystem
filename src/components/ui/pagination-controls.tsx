"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
  itemName = "items",
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 py-4 text-sm"
    >
      <p className="text-slate-500">
        Showing {itemName} {firstItem}-{lastItem} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 px-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          Previous
        </button>
        <span
          aria-current="page"
          className="min-w-16 text-center text-slate-600"
        >
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 px-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </nav>
  );
}
