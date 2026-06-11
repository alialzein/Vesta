import type { MemoryType } from '@/lib/types';

/**
 * Phase 10 — shared Memory & Rules presets for the UI (the workspace page and
 * the rail's quick-add use the same list, so the two never drift).
 *
 * Each type carries a SAMPLE the manager could literally type — shown as the
 * input placeholder when that type is selected (guide rule 5a: show exactly
 * WHAT to write, not just a label).
 */

export const MEMORY_TYPE_OPTIONS: { value: MemoryType; label: string }[] = [
  { value: 'vip', label: 'VIP person' },
  { value: 'tone', label: 'Tone' },
  { value: 'delegation_rule', label: 'Delegation rule' },
  { value: 'do_not_do', label: 'Do NOT do' },
  { value: 'project_context', label: 'Project context' },
  { value: 'company_context', label: 'Company context' },
  { value: 'preference', label: 'Preference' },
  { value: 'personal', label: 'About me (personal)' },
];

/** A copyable example per type, shown as the input placeholder. */
export const MEMORY_PLACEHOLDER: Record<MemoryType, string> = {
  vip: 'e.g. Treat maya@cedars.com as VIP',
  tone: 'e.g. Friendly but brief — two short paragraphs max, no exclamation marks',
  delegation_rule: 'e.g. Invoices, receipts, and payment questions go to Lina',
  do_not_do: 'e.g. Never commit to prices or dates that aren’t already in the thread',
  project_context: 'e.g. The Q3 launch is our #1 priority this quarter',
  company_context: 'e.g. We are a 40-person logistics company; I run operations',
  preference: 'e.g. Always answer the CEO same-day',
  personal: 'e.g. I’m in meetings most mornings — I reply after 2pm; I like bullet points',
};
