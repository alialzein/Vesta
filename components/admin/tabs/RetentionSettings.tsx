'use client';

import { useState } from 'react';
import { ActionButton } from '@/components/admin/ActionButton';
import { adminSaveAppSettings, adminPurgeSoftDeleted, adminApplyRetention } from '@/app/(admin)/admin/actions';

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? null : Math.max(0, Math.floor(n));
}

export function RetentionSettings({
  scanBack,
  retentionMonths,
  graceDays,
}: {
  scanBack: number;
  retentionMonths: number | null;
  graceDays: number;
}) {
  const [scan, setScan] = useState(String(scanBack));
  const [retention, setRetention] = useState(retentionMonths === null ? '' : String(retentionMonths));
  const [grace, setGrace] = useState(String(graceDays));

  return (
    <div className="rounded-[14px] border border-line bg-panel p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Initial scan-back (days)"
          hint="Import window on first connect"
          value={scan}
          onChange={setScan}
        />
        <Field
          label="Retention (months)"
          hint="Blank = keep forever"
          value={retention}
          onChange={setRetention}
          placeholder="∞"
        />
        <Field
          label="Soft-delete grace (days)"
          hint="Purge deleted mail after"
          value={grace}
          onChange={setGrace}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ActionButton
          run={() =>
            adminSaveAppSettings({
              initial_scan_back_days: numOrNull(scan) ?? 7,
              retention_months: numOrNull(retention),
              soft_delete_grace_days: numOrNull(grace) ?? 30,
            })
          }
        >
          Save policy
        </ActionButton>

        <ActionButton
          subtle
          confirm="Permanently delete soft-deleted mail past the grace window for ALL users? This frees storage and cannot be undone."
          run={() => adminPurgeSoftDeleted()}
        >
          Purge soft-deleted now
        </ActionButton>

        <ActionButton
          danger
          confirm="Purge mail older than the global retention window for ALL users? This permanently deletes stored messages."
          run={() => adminApplyRetention()}
        >
          Apply retention now
        </ActionButton>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-line bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
      />
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}
