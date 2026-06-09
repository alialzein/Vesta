'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Quick-add task box (Phase 8). The manager types a plain line — "Call the vendor
 * tomorrow 3pm" — and Vesta parses the due date out of it (deterministic, no AI) and
 * adds it to Today's Radar as a task. Theme-aware (light + dark via tokens).
 */
export function QuickAddTask({
  onAdd,
  onAiAdd,
  busy = false,
}: {
  onAdd: (input: string) => void;
  /** AI capture (the ✨ button): structures the note with one AI call. */
  onAiAdd?: (input: string) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState('');
  const canSubmit = value.trim().length > 0 && !busy;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(value.trim());
    setValue('');
  }

  function aiAdd() {
    if (!canSubmit || !onAiAdd) return;
    onAiAdd(value.trim());
    setValue('');
  }

  return (
    <form
      onSubmit={submit}
      className="relative z-[1] flex items-center gap-2 rounded-[var(--radius)] border border-line bg-panel p-[10px_12px] shadow-glow"
    >
      <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent">
        <Icon name="plus" className="h-[15px] w-[15px]" />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Add a task"
        placeholder="Add a task — e.g. “Call the vendor tomorrow 3pm”"
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
      />
      {onAiAdd && (
        <button
          type="button"
          onClick={aiAdd}
          disabled={!canSubmit}
          title="Let AI structure this (a meeting, call, reminder…)"
          className="inline-flex flex-none items-center gap-[5px] rounded-[10px] border border-accent/40 bg-accent-soft px-[11px] py-[7px] text-[12.5px] font-semibold text-accent transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="sparkle" className="h-[14px] w-[14px]" />
          AI
        </button>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex flex-none items-center gap-[6px] rounded-[10px] bg-gradient-to-br from-accent to-accent-2 px-[13px] py-[7px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add task
      </button>
    </form>
  );
}
