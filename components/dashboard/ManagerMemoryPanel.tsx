'use client';

import { useState } from 'react';
import type { ManagerMemory, MemoryType } from '@/lib/types';
import { demoMemories } from '@/lib/demo-data';
import { Icon } from '@/components/ui/Icon';

const TYPE_OPTIONS: { value: MemoryType; label: string }[] = [
  { value: 'vip', label: 'VIP person' },
  { value: 'tone', label: 'Tone' },
  { value: 'delegation_rule', label: 'Delegation rule' },
  { value: 'do_not_do', label: 'Do NOT do' },
  { value: 'project_context', label: 'Project context' },
  { value: 'company_context', label: 'Company context' },
  { value: 'preference', label: 'Preference' },
];

const TYPE_LABEL: Record<MemoryType, string> = {
  vip: 'VIP',
  tone: 'Tone',
  delegation_rule: 'Delegate',
  do_not_do: 'Never',
  project_context: 'Project',
  company_context: 'Company',
  preference: 'Pref',
};

const TAG_TONE: Record<MemoryType, string> = {
  vip: 'bg-red-soft text-red',
  tone: 'bg-accent-soft text-accent',
  delegation_rule: 'bg-amber-soft text-amber',
  do_not_do: 'bg-red-soft text-red',
  project_context: 'bg-green-soft text-green',
  company_context: 'bg-green-soft text-green',
  preference: 'bg-green-soft text-green',
};

let nextId = 100;

export function ManagerMemoryPanel() {
  const [memories, setMemories] = useState<ManagerMemory[]>(demoMemories);
  const [type, setType] = useState<MemoryType>('vip');
  const [text, setText] = useState('');

  function addMemory() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMemories((prev) => [{ id: `mem-${nextId++}`, type, text: trimmed }, ...prev]);
    setText('');
  }

  function forget(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow backdrop-blur-[16px]">
      <h2 className="m-0 flex items-center gap-[9px] font-display text-[18px] font-medium tracking-tight">
        Manager Memory
        <span className="ml-auto rounded-full bg-accent-soft px-[9px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
          Teaches AI
        </span>
      </h2>
      <p className="mt-[6px] text-[13px] leading-normal text-muted">
        Save VIPs, tone, delegation rules and context. The assistant uses these every time it
        prioritises and drafts.
      </p>

      <div className="mt-[14px] flex flex-col gap-[9px]">
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MemoryType)}
            aria-label="Memory type"
            className="w-[130px] flex-none cursor-pointer rounded-[11px] border border-line bg-field px-[10px] py-[9px] text-[12.5px] font-semibold text-ink focus:border-accent"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMemory();
            }}
            placeholder="e.g. Treat Cedars Group as VIP"
            aria-label="New memory text"
            className="flex-1 rounded-[11px] border border-line bg-field px-3 py-[9px] text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={addMemory}
          className="justify-center rounded-[11px] border-none bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[9px] text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,125,235,0.3)] transition hover:brightness-110"
        >
          ＋ Remember this
        </button>
      </div>

      <div className="v-scroll mt-[14px] flex max-h-[240px] flex-col gap-2 overflow-y-auto pr-[2px]">
        {memories.map((m) => (
          <div
            key={m.id}
            className="animate-rise flex items-start gap-[10px] rounded-xl border border-line bg-panel-2 px-3 py-[11px]"
          >
            <span
              className={`mt-px flex-none rounded-md px-[7px] py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-wide ${TAG_TONE[m.type]}`}
            >
              {TYPE_LABEL[m.type]}
            </span>
            <span className="flex-1 text-[13px] leading-snug text-ink-soft">{m.text}</span>
            <button
              type="button"
              onClick={() => forget(m.id)}
              title="Forget this"
              aria-label={`Forget memory: ${m.text}`}
              className="flex-none border-none bg-transparent px-[2px] text-base leading-none text-muted transition hover:text-red"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-[10px] flex items-center gap-[7px] text-[11.5px] text-muted">
        <Icon name="info" className="h-[14px] w-[14px] flex-none text-accent" />
        This memory affects future prioritization. You can edit or delete it anytime.
      </div>
    </div>
  );
}
