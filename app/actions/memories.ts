'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { extractEmail } from '@/lib/ai/memory';
import type { Json } from '@/lib/database.types';

/**
 * Phase 10 — manager actions on Memory & Rules. All RLS-scoped (the
 * authenticated client only touches the manager's own rows).
 *
 * Approval model (no schema change):
 * - Memories the manager types are `source='manual'`, active immediately.
 * - Memories Vesta proposes are `source='ai_suggested'`, `is_active=false`,
 *   `metadata.status='pending'` — they do NOTHING until approved here.
 *
 * VIP side-effect: a VIP memory that names an email address also flips
 * `people.is_vip`, which drives triage inclusion, the engine's +20 priority
 * boost, and the analysis prompt's VIP signal. The people row is stamped with
 * `vip_reason='memory:<id>'` so deleting/pausing that memory un-VIPs exactly
 * the flag it set — never one set by hand in Inbox/Hidden.
 */

export type MemoryActionResult = { ok: boolean; error?: string };

// Mirrors lib/types.ts MemoryType ('use server' files may only export async
// functions, so the list lives here unexported).
const MEMORY_TYPES = [
  'vip',
  'tone',
  'delegation_rule',
  'do_not_do',
  'project_context',
  'company_context',
  'preference',
] as const;
type MemoryTypeValue = (typeof MEMORY_TYPES)[number];

const TEXT_CAP = 500;

function validType(v: string): v is MemoryTypeValue {
  return (MEMORY_TYPES as readonly string[]).includes(v);
}

function vipStamp(memoryId: string): string {
  return `memory:${memoryId}`;
}

/** Set people.is_vip for the email a VIP memory names (insert if unknown). */
async function applyVipFlag(
  db: ReturnType<typeof createClient>,
  userId: string,
  memoryId: string,
  email: string,
) {
  await db.from('people').upsert(
    {
      user_id: userId,
      email,
      domain: email.split('@')[1] ?? null,
      is_vip: true,
      vip_reason: vipStamp(memoryId),
    },
    { onConflict: 'user_id,email' },
  );
}

/** Clear only the VIP flag this memory set (manual flags are untouched). */
async function clearVipFlag(db: ReturnType<typeof createClient>, userId: string, memoryId: string) {
  await db
    .from('people')
    .update({ is_vip: false, vip_reason: null })
    .eq('user_id', userId)
    .eq('vip_reason', vipStamp(memoryId));
}

/**
 * Add a memory/rule the manager typed. Active immediately (their own words).
 * `scopeEmail` pins it to one person (used by the rail's quick-add).
 */
export async function addMemory(input: {
  type: string;
  text: string;
  scopeEmail?: string | null;
}): Promise<MemoryActionResult> {
  const user = await requireUser();
  const text = input.text.trim().slice(0, TEXT_CAP);
  if (!text) return { ok: false, error: 'Write the memory first.' };
  if (!validType(input.type)) return { ok: false, error: 'Unknown memory type.' };
  const scopeEmail = input.scopeEmail?.trim().toLowerCase() || null;

  const db = createClient();
  const { data: row, error } = await db
    .from('manager_memories')
    .insert({
      user_id: user.id,
      memory_type: input.type,
      memory_text: text,
      scope: scopeEmail ? 'person' : null,
      scope_ref: scopeEmail,
      source: 'manual',
      is_active: true,
      metadata: { status: 'approved' } as unknown as Json,
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Could not save.' };

  if (input.type === 'vip') {
    const email = scopeEmail ?? extractEmail(text);
    if (email) await applyVipFlag(db, user.id, row.id, email);
  }

  revalidatePath('/');
  return { ok: true };
}

/** Edit a memory's text (kept active; VIP email re-detected). */
export async function updateMemoryText(id: string, text: string): Promise<MemoryActionResult> {
  const user = await requireUser();
  const trimmed = text.trim().slice(0, TEXT_CAP);
  if (!trimmed) return { ok: false, error: 'Memory text cannot be empty.' };
  const db = createClient();
  const { data: row, error } = await db
    .from('manager_memories')
    .update({ memory_text: trimmed })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, memory_type, scope_ref, is_active')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Could not update.' };

  if (row.memory_type === 'vip' && row.is_active) {
    await clearVipFlag(db, user.id, id); // the text may now name someone else
    const email = row.scope_ref ?? extractEmail(trimmed);
    if (email) await applyVipFlag(db, user.id, id, email);
  }

  revalidatePath('/');
  return { ok: true };
}

/** Pause / resume a memory. Paused = kept but ignored by AI + VIP flags. */
export async function setMemoryActive(id: string, active: boolean): Promise<MemoryActionResult> {
  const user = await requireUser();
  const db = createClient();
  const { data: row, error } = await db
    .from('manager_memories')
    .update({ is_active: active })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, memory_type, memory_text, scope_ref')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Could not update.' };

  if (row.memory_type === 'vip') {
    if (active) {
      const email = row.scope_ref ?? extractEmail(row.memory_text);
      if (email) await applyVipFlag(db, user.id, id, email);
    } else {
      await clearVipFlag(db, user.id, id);
    }
  }

  revalidatePath('/');
  return { ok: true };
}

/** Forget a memory entirely (also clears any VIP flag it set). */
export async function deleteMemory(id: string): Promise<MemoryActionResult> {
  const user = await requireUser();
  const db = createClient();
  await clearVipFlag(db, user.id, id);
  const { error } = await db
    .from('manager_memories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/** Approve a pending suggestion — it becomes a normal active memory. */
export async function approveMemory(id: string): Promise<MemoryActionResult> {
  const user = await requireUser();
  const db = createClient();
  const { data: existing } = await db
    .from('manager_memories')
    .select('metadata')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  const metadata = {
    ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
    status: 'approved',
    approved_at: new Date().toISOString(),
  };
  const { data: row, error } = await db
    .from('manager_memories')
    .update({ is_active: true, metadata: metadata as unknown as Json })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, memory_type, memory_text, scope_ref')
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? 'Could not approve.' };

  if (row.memory_type === 'vip') {
    const email = row.scope_ref ?? extractEmail(row.memory_text);
    if (email) await applyVipFlag(db, user.id, id, email);
  }

  revalidatePath('/');
  return { ok: true };
}

/** Reject a pending suggestion — it is deleted, never applied. */
export async function rejectMemory(id: string): Promise<MemoryActionResult> {
  return deleteMemory(id);
}
