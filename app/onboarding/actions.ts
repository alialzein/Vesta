'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

type MemoryInsert = Database['public']['Tables']['manager_memories']['Insert'];

export type OnboardingAnswers = {
  role?: string;
  tone?: string;
  vips?: string; // comma/newline separated
  topics?: string[];
};

/** Split a free-text list (commas / newlines) into trimmed, non-empty items. */
function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Finish onboarding: persist the manager's answers as real, user-owned
 * `manager_memories` (approval-first — these are the user's own entries), set
 * `profiles.role`, and stamp `onboarded_at`. Demo-safe: no AI calls. Writes go
 * through the authenticated server client (RLS = own rows).
 */
export async function completeOnboarding(answers: OnboardingAnswers): Promise<void> {
  const user = await requireUser();
  const supabase = createClient();

  const memories: MemoryInsert[] = [];
  const role = answers.role?.trim();
  if (role) {
    memories.push({
      user_id: user.id,
      memory_type: 'company_context',
      memory_text: `My role: ${role}.`,
      source: 'manual',
    });
  }
  const tone = answers.tone?.trim();
  if (tone) {
    memories.push({
      user_id: user.id,
      memory_type: 'tone',
      memory_text: tone,
      source: 'manual',
    });
  }
  for (const vip of splitList(answers.vips)) {
    memories.push({
      user_id: user.id,
      memory_type: 'vip',
      memory_text: `Treat ${vip} as VIP.`,
      source: 'manual',
    });
  }
  for (const topic of answers.topics ?? []) {
    const t = topic.trim();
    if (!t) continue;
    memories.push({
      user_id: user.id,
      memory_type: 'preference',
      memory_text: `Interested in: ${t}.`,
      scope: 'global',
      source: 'manual',
    });
  }

  if (memories.length > 0) {
    await supabase.from('manager_memories').insert(memories);
  }

  await supabase
    .from('profiles')
    .update({ role: role || undefined, onboarded_at: new Date().toISOString() })
    .eq('id', user.id);

  redirect('/');
}

/** Skip onboarding: just stamp onboarded_at so the wizard is not shown again. */
export async function skipOnboarding(): Promise<void> {
  const user = await requireUser();
  const supabase = createClient();
  await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', user.id);
  redirect('/');
}
