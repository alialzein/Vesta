'use client';

import { useRouter } from 'next/navigation';

/** Filter the audit log by action. Navigates with ?action=… (server re-queries). */
export function AuditFilter({ actions, current }: { actions: string[]; current: string }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/admin/audit?action=${encodeURIComponent(v)}` : '/admin/audit');
      }}
      className="rounded-[10px] border border-line bg-field px-3 py-[7px] text-[12.5px] text-ink outline-none focus:border-accent"
    >
      <option value="">All actions</option>
      {actions.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
