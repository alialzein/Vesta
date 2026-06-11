/**
 * Phase 10 — memory retrieval for the AI paths (pure, no I/O).
 *
 * The manager teaches Vesta in `manager_memories` (VIPs, tone, delegation
 * rules, hard "never do" limits, project/company context). These helpers pick
 * WHICH active memories matter for a given task and shape them into compact
 * prompt lines, so analysis and drafting read the same memory the manager sees
 * in Memory & Rules. Selection is deterministic: type + scope matching only —
 * no embeddings, no AI calls.
 *
 * Scoping: a memory with `scope='person'` applies only when its `scope_ref`
 * (an email, lowercased) or its text mentions the sender/recipient. Everything
 * else is treated as global.
 */

export type MemoryKind =
  | 'vip'
  | 'tone'
  | 'delegation_rule'
  | 'do_not_do'
  | 'project_context'
  | 'company_context'
  | 'preference';

/** The slice of a manager_memories row retrieval needs. */
export type MemoryRow = {
  id: string;
  memory_type: string;
  memory_text: string;
  scope: string | null;
  scope_ref: string | null;
  is_active: boolean;
};

/** Who the email under analysis / the draft is about. */
export type MemoryAudience = {
  email?: string | null;
  name?: string | null;
};

const LINE_CAP = 220; // chars per memory line sent to the model
const MAX_LINES = 10; // total memory lines per prompt — memory must stay cheap

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, LINE_CAP);
}

/** Does this memory apply to the given person (sender/recipient)? */
export function appliesTo(memory: MemoryRow, who: MemoryAudience): boolean {
  if (memory.scope !== 'person') return true; // global (or unscoped) memory
  const ref = memory.scope_ref?.trim().toLowerCase();
  const email = who.email?.trim().toLowerCase();
  if (ref && email && ref === email) return true;
  // Fall back to a name/email mention inside the memory text itself.
  const hay = memory.memory_text.toLowerCase();
  if (email && hay.includes(email)) return true;
  const name = who.name?.trim().toLowerCase();
  if (name && name.length >= 3 && hay.includes(name)) return true;
  return false;
}

function pick(
  memories: MemoryRow[],
  types: MemoryKind[],
  who: MemoryAudience,
  max: number,
): string[] {
  const wanted = new Set<string>(types);
  return memories
    .filter((m) => m.is_active && wanted.has(m.memory_type) && appliesTo(m, who))
    .slice(0, max)
    .map((m) => clean(m.memory_text))
    .filter(Boolean);
}

/**
 * Memory lines for the ANALYSIS prompt — everything that shapes priority,
 * category, and the suggested next action: VIPs, delegation rules, hard
 * limits, and standing context. Tone is for writing, not triage — excluded.
 */
export function memoryNotesForAnalysis(memories: MemoryRow[], sender: MemoryAudience): string[] {
  return pick(
    memories,
    ['vip', 'delegation_rule', 'do_not_do', 'project_context', 'company_context', 'preference'],
    sender,
    MAX_LINES,
  );
}

/** Memory lines for the DRAFT prompt, split by how the model must obey them. */
export type DraftMemoryNotes = {
  /** Style guidance: tone + preferences (the model should follow). */
  toneNotes: string[];
  /** Hard limits ("never do") — the model MUST obey these. */
  hardRules: string[];
  /** Background facts: project/company/person context (use when relevant). */
  contextNotes: string[];
};

export function memoryNotesForDraft(
  memories: MemoryRow[],
  recipient: MemoryAudience,
): DraftMemoryNotes {
  return {
    toneNotes: pick(memories, ['tone', 'preference'], recipient, 6),
    hardRules: pick(memories, ['do_not_do'], recipient, 4),
    contextNotes: pick(
      memories,
      ['project_context', 'company_context', 'vip'],
      recipient,
      5,
    ),
  };
}

/**
 * Is this sender a VIP according to memory? (people.is_vip is checked
 * separately — this catches VIP memories that name the person/domain.)
 */
export function isVipByMemory(memories: MemoryRow[], sender: MemoryAudience): boolean {
  const email = sender.email?.trim().toLowerCase();
  const domain = email?.split('@')[1];
  const name = sender.name?.trim().toLowerCase();
  return memories.some((m) => {
    if (!m.is_active || m.memory_type !== 'vip') return false;
    const hay = m.memory_text.toLowerCase();
    const ref = m.scope_ref?.trim().toLowerCase();
    if (ref && email && ref === email) return true;
    if (email && hay.includes(email)) return true;
    if (domain && hay.includes(`@${domain}`)) return true;
    if (name && name.length >= 3 && hay.includes(name)) return true;
    return false;
  });
}

/** First email address mentioned in a text, lowercased (VIP side-effects). */
export function extractEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}
