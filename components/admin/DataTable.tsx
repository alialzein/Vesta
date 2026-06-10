'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Admin Wave 3 — shared client-side table controls for the operator console:
 * text search, per-column facet filters, sortable headers, and pagination.
 *
 * The console's datasets are small (hundreds of rows), so filtering/sorting is
 * done client-side over the rows each server page already fetched — instant UX,
 * no query round-trips. Each admin page builds its own small client table
 * component on top of `useTableControls` + these presentational pieces, keeping
 * cell rendering (badges, action buttons) fully typed per page.
 */

export type SortDir = 'asc' | 'desc';
export type SortState<T> = { key: keyof T; dir: SortDir } | null;

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  // Nulls/undefined/empty sort last regardless of direction.
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? -1 : 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function useTableControls<T extends Record<string, unknown>>(
  rows: T[],
  opts: {
    /** Row fields matched by the free-text search (case-insensitive substring). */
    searchKeys: (keyof T)[];
    /** Row fields offered as exact-match dropdown filters. */
    facetKeys?: (keyof T)[];
    initialSort?: { key: keyof T; dir: SortDir };
    pageSize?: number;
  },
) {
  const [search, setSearchRaw] = useState('');
  const [facetValues, setFacetValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState<T>>(opts.initialSort ?? null);
  const [page, setPage] = useState(0);
  const pageSize = opts.pageSize ?? 25;

  // Distinct values per facet key (from the full dataset, stable order).
  const facetOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of opts.facetKeys ?? []) {
      const seen = new Set<string>();
      for (const r of rows) {
        const v = r[key];
        if (v !== null && v !== undefined && String(v) !== '') seen.add(String(v));
      }
      map[String(key)] = [...seen].sort();
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hit = opts.searchKeys.some((k) =>
          String(r[k] ?? '')
            .toLowerCase()
            .includes(q),
        );
        if (!hit) return false;
      }
      for (const [key, value] of Object.entries(facetValues)) {
        if (value && String(r[key as keyof T] ?? '') !== value) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, facetValues]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const base = cmp(a[sort.key], b[sort.key]);
      // Keep the nulls-last behavior regardless of direction.
      if (a[sort.key] == null || b[sort.key] == null || a[sort.key] === '' || b[sort.key] === '')
        return base;
      return base * dir;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function setSearch(s: string) {
    setSearchRaw(s);
    setPage(0);
  }
  function setFacet(key: string, value: string) {
    setFacetValues((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }
  function toggleSort(key: keyof T) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  }

  return {
    rows: pageRows,
    total: sorted.length,
    search,
    setSearch,
    facetValues,
    setFacet,
    facetOptions,
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageCount,
  };
}

/* ----------------------------- Presentational ----------------------------- */

/** Search box + facet dropdowns + result count, above a table. */
export function TableToolbar({
  search,
  onSearch,
  placeholder = 'Search…',
  facets = [],
  total,
  children,
}: {
  search: string;
  onSearch: (s: string) => void;
  placeholder?: string;
  facets?: { key: string; label: string; options: string[]; value: string; onChange: (v: string) => void }[];
  total: number;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted"
        />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-[230px] rounded-[10px] border border-line bg-field py-[7px] pl-8 pr-3 text-[12.5px] text-ink outline-none transition placeholder:text-muted focus:border-accent"
        />
      </span>

      {facets.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          aria-label={`Filter by ${f.label}`}
          className="rounded-[10px] border border-line bg-field px-2.5 py-[7px] text-[12.5px] text-ink-soft outline-none transition focus:border-accent"
        >
          <option value="">{f.label}: all</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ))}

      {children}

      <span className="ml-auto text-[12px] text-muted">
        {total.toLocaleString('en-US')} result{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

/** A sortable column header (use inside <thead><tr>). */
export function SortTh<T>({
  label,
  sortKey,
  sort,
  onToggle,
  align = 'left',
}: {
  label: string;
  sortKey: keyof T;
  sort: SortState<T>;
  onToggle: (key: keyof T) => void;
  align?: 'left' | 'right';
}) {
  const active = sort?.key === sortKey;
  return (
    <th
      className={`border-b border-line px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] transition hover:text-ink ${
          active ? 'text-ink' : ''
        }`}
      >
        {label}
        <span className="text-[9px]" aria-hidden="true">
          {active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

/** Prev/next pagination footer (hidden when everything fits on one page). */
export function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-[12.5px] text-muted">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 0}
        className="rounded-[8px] border border-line px-2.5 py-1 font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-40"
      >
        ‹ Prev
      </button>
      <span>
        Page {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount - 1}
        className="rounded-[8px] border border-line px-2.5 py-1 font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-40"
      >
        Next ›
      </button>
    </div>
  );
}
