'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { adminSetTimezone } from '@/app/(admin)/admin/actions';

/**
 * Edit a user's timezone (profiles.timezone). Drives how times are shown to that
 * user in the app. Offers the browser's full IANA zone list as suggestions while
 * still allowing free typing; the server re-validates before saving.
 */
export function TimezoneEditor({ userId, current }: { userId: string; current: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  const zones = useMemo<string[]>(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return [];
    }
  }, []);

  function save() {
    startTransition(async () => {
      const res = await adminSetTimezone(userId, value);
      showToast(res.message, res.ok ? 'success' : 'info');
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        list="tz-options"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="User timezone"
        placeholder="e.g. Asia/Beirut"
        className="w-[220px] rounded-[10px] border border-line bg-field px-3 py-[7px] text-[12.5px] text-ink outline-none transition focus:border-accent"
      />
      <datalist id="tz-options">
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={save}
        disabled={pending || !value.trim() || value === current}
        className="rounded-[10px] border border-accent/50 px-3 py-[7px] text-[12.5px] font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-40"
      >
        {pending ? 'Saving…' : 'Save timezone'}
      </button>
    </div>
  );
}
