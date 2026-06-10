import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAiConfigured } from '@/lib/ai/config';
import { getEffectiveSendMode } from '@/lib/ai/runtime';
import { hasSendScope } from '@/lib/graph/tokens';

/**
 * Phase 9 — what the draft composer is allowed to do for this manager right now.
 * Computed server-side so the UI can show the right call to action (generate vs
 * "AI not configured"; send vs "reconnect Outlook to enable sending") without
 * leaking any secret or doing an async scope check from the client.
 */
export type DraftCapabilities = {
  /** AI is configured, so Vesta can generate drafts. */
  aiEnabled: boolean;
  /** A Microsoft mailbox is connected. */
  mailboxConnected: boolean;
  /** Approving a draft can complete (send, or build an Outlook draft in draft-only mode). */
  sendingEnabled: boolean;
  /** 'send' = sends via Graph; 'draft_only' = builds an Outlook draft, you send it there. */
  sendMode: 'send' | 'draft_only';
};

export async function getDraftCapabilities(): Promise<DraftCapabilities> {
  const aiEnabled = isAiConfigured();
  // Send mode resolves per-user → global panel setting → env (Wave 4).
  const user = await getCurrentUser();
  const draftOnly = user ? (await getEffectiveSendMode(user.id)) === 'draft_only' : false;

  const supabase = createClient();
  const { data: mailbox } = await supabase
    .from('mailboxes')
    .select('integration_id')
    .eq('provider', 'microsoft')
    .eq('status', 'active')
    .maybeSingle();

  const mailboxConnected = !!mailbox?.integration_id;
  // Draft-only needs no send scope (we only create a draft in Outlook). Real sending
  // needs the Mail.Send scope, which mailboxes connected before Phase 9 lack.
  const sendingEnabled = !mailboxConnected
    ? false
    : draftOnly
      ? true
      : await hasSendScope(mailbox!.integration_id);
  return { aiEnabled, mailboxConnected, sendingEnabled, sendMode: draftOnly ? 'draft_only' : 'send' };
}
