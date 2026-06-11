import { describe, expect, it } from 'vitest';
import {
  appliesTo,
  extractEmail,
  isVipByMemory,
  memoryNotesForAnalysis,
  memoryNotesForDraft,
  type MemoryRow,
} from '../memory';

function mem(over: Partial<MemoryRow>): MemoryRow {
  return {
    id: 'm1',
    memory_type: 'preference',
    memory_text: 'Some note',
    scope: null,
    scope_ref: null,
    is_active: true,
    ...over,
  };
}

describe('appliesTo', () => {
  it('treats unscoped memories as global', () => {
    expect(appliesTo(mem({}), { email: 'a@b.com' })).toBe(true);
    expect(appliesTo(mem({}), {})).toBe(true);
  });

  it('matches person-scoped memories by scope_ref email', () => {
    const m = mem({ scope: 'person', scope_ref: 'Maya@Cedars.com' });
    expect(appliesTo(m, { email: 'maya@cedars.com' })).toBe(true);
    expect(appliesTo(m, { email: 'other@cedars.com' })).toBe(false);
  });

  it('falls back to a name or email mention in the text', () => {
    const m = mem({ scope: 'person', memory_text: 'Maya Chen prefers short updates.' });
    expect(appliesTo(m, { name: 'Maya Chen' })).toBe(true);
    expect(appliesTo(m, { name: 'Bob' })).toBe(false);
    // Tiny names never match by substring (avoid false positives like "Al").
    expect(appliesTo(mem({ scope: 'person', memory_text: 'Ali is VIP' }), { name: 'Al' })).toBe(
      false,
    );
  });
});

describe('memoryNotesForAnalysis', () => {
  it('includes triage-shaping types and excludes tone; skips inactive', () => {
    const memories: MemoryRow[] = [
      mem({ id: '1', memory_type: 'vip', memory_text: 'Cedars Group is a VIP client.' }),
      mem({ id: '2', memory_type: 'tone', memory_text: 'Write warmly.' }),
      mem({ id: '3', memory_type: 'delegation_rule', memory_text: 'Invoices go to Lina.' }),
      mem({ id: '4', memory_type: 'do_not_do', memory_text: 'Never commit budget on email.' }),
      mem({ id: '5', memory_type: 'project_context', memory_text: 'Q3 launch is the priority.', is_active: false }),
    ];
    const notes = memoryNotesForAnalysis(memories, {});
    expect(notes).toContain('Cedars Group is a VIP client.');
    expect(notes).toContain('Invoices go to Lina.');
    expect(notes).toContain('Never commit budget on email.');
    expect(notes).not.toContain('Write warmly.');
    expect(notes).not.toContain('Q3 launch is the priority.');
  });

  it('filters person-scoped notes by the sender', () => {
    const memories: MemoryRow[] = [
      mem({
        id: '1',
        memory_type: 'preference',
        memory_text: 'Escalate anything from Maya immediately.',
        scope: 'person',
        scope_ref: 'maya@cedars.com',
      }),
    ];
    expect(memoryNotesForAnalysis(memories, { email: 'maya@cedars.com' })).toHaveLength(1);
    expect(memoryNotesForAnalysis(memories, { email: 'sam@other.com' })).toHaveLength(0);
  });

  it('caps the number of lines', () => {
    const memories = Array.from({ length: 20 }, (_, i) =>
      mem({ id: String(i), memory_type: 'preference', memory_text: `Note ${i}` }),
    );
    expect(memoryNotesForAnalysis(memories, {}).length).toBeLessThanOrEqual(10);
  });
});

describe('memoryNotesForDraft', () => {
  it('splits tone, hard rules, and context', () => {
    const memories: MemoryRow[] = [
      mem({ id: '1', memory_type: 'tone', memory_text: 'Short sentences, no fluff.' }),
      mem({ id: '2', memory_type: 'do_not_do', memory_text: 'Never promise same-day delivery.' }),
      mem({ id: '3', memory_type: 'company_context', memory_text: 'We are Vesta GmbH.' }),
      mem({ id: '4', memory_type: 'delegation_rule', memory_text: 'Invoices go to Lina.' }),
    ];
    const notes = memoryNotesForDraft(memories, {});
    expect(notes.toneNotes).toEqual(['Short sentences, no fluff.']);
    expect(notes.hardRules).toEqual(['Never promise same-day delivery.']);
    expect(notes.contextNotes).toEqual(['We are Vesta GmbH.']);
  });

  it("includes 'about me' personal memories as context in drafts AND analysis", () => {
    const memories: MemoryRow[] = [
      mem({ id: '1', memory_type: 'personal', memory_text: 'I reply after 2pm; bullet points.' }),
    ];
    expect(memoryNotesForDraft(memories, {}).contextNotes).toEqual([
      'I reply after 2pm; bullet points.',
    ]);
    expect(memoryNotesForAnalysis(memories, {})).toEqual(['I reply after 2pm; bullet points.']);
  });
});

describe('isVipByMemory', () => {
  const memories: MemoryRow[] = [
    mem({ id: '1', memory_type: 'vip', memory_text: 'Treat Cedars Group as VIP.' }),
    mem({ id: '2', memory_type: 'vip', memory_text: 'maya@cedars.com is our key client.' }),
    mem({ id: '3', memory_type: 'vip', memory_text: 'Anyone @northwind.com is VIP.' }),
    mem({ id: '4', memory_type: 'vip', memory_text: 'Old VIP', is_active: false }),
  ];

  it('matches by email, domain mention, or name mention', () => {
    expect(isVipByMemory(memories, { email: 'maya@cedars.com' })).toBe(true);
    expect(isVipByMemory(memories, { email: 'sam@northwind.com' })).toBe(true);
    expect(isVipByMemory(memories, { name: 'Cedars Group' })).toBe(true);
    expect(isVipByMemory(memories, { email: 'random@nowhere.com', name: 'Random' })).toBe(false);
  });

  it('ignores inactive VIP memories', () => {
    expect(isVipByMemory([mem({ memory_type: 'vip', memory_text: 'X', is_active: false })], { name: 'X' })).toBe(false);
  });
});

describe('extractEmail', () => {
  it('finds the first email and lowercases it', () => {
    expect(extractEmail('Treat Maya@Cedars.com as VIP')).toBe('maya@cedars.com');
    expect(extractEmail('no email here')).toBeNull();
    expect(extractEmail(null)).toBeNull();
  });
});
