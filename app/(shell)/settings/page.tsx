import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isGraphConfigured } from '@/lib/graph/oauth';
import { hasSendScope } from '@/lib/graph/tokens';
import { OutlookCard, type OutlookStatus } from '@/components/settings/OutlookCard';
import { ManagedSenders, type ManagedRule } from '@/components/settings/ManagedSenders';

export const dynamic = 'force-dynamic';

/** Map the ?outlook= query flag to a friendly notice. */
const NOTICES: Record<string, string> = {
  connected: 'Outlook connected. Vesta can now read this mailbox.',
  disconnected: 'Outlook disconnected. Vesta no longer accesses that mailbox.',
  not_configured:
    'Outlook isn’t configured yet — add the Microsoft app keys to enable it (see docs).',
  error: 'Something went wrong connecting Outlook. Please try again.',
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { outlook?: string };
}) {
  await requireUser();

  const supabase = createClient();
  const [{ data: integration }, { data: mailbox }, { data: ruleRows }, { data: vipRows }] =
    await Promise.all([
      supabase
        .from('user_integrations')
        .select('status, provider_email, connected_at')
        .eq('provider', 'microsoft')
        .maybeSingle(),
      supabase
        .from('mailboxes')
        .select('triage_mode, integration_id')
        .eq('provider', 'microsoft')
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('manager_rules')
        .select('id, rule_type, conditions')
        .in('rule_type', ['allow', 'suppression']),
      supabase.from('people').select('email, display_name').eq('is_vip', true),
    ]);

  const connected = integration?.status === 'connected';
  const sendingEnabled =
    connected && mailbox?.integration_id ? await hasSendScope(mailbox.integration_id) : false;

  const status: OutlookStatus = {
    connected,
    email: integration?.provider_email ?? null,
    connectedAt: integration?.connected_at ?? null,
    configured: isGraphConfigured(),
    triageMode: (mailbox?.triage_mode as OutlookStatus['triageMode']) ?? 'focused',
    sendingEnabled,
  };

  const managedRules: ManagedRule[] = (ruleRows ?? [])
    .map((r) => ({
      id: r.id,
      kind: (r.rule_type === 'suppression' ? 'mute' : 'allow') as 'mute' | 'allow',
      value: String((r.conditions as { value?: string } | null)?.value ?? ''),
    }))
    .filter((r) => r.value);
  const managedVips = (vipRows ?? [])
    .filter((p): p is { email: string; display_name: string | null } => Boolean(p.email))
    .map((p) => ({ email: p.email, name: p.display_name }));

  const notice = searchParams.outlook ? (NOTICES[searchParams.outlook] ?? null) : null;

  return (
    // Renders inside the AppShell; settings cards keep a readable max width
    // while the page itself fills the shell's content column.
    <section className="flex w-full max-w-[860px] flex-col gap-4">
      <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
        Email connection
      </h2>
      <OutlookCard status={status} notice={notice} />
      {status.connected && <ManagedSenders rules={managedRules} vips={managedVips} />}
      <p className="text-[12px] leading-relaxed text-muted">
        Gmail and other (IMAP) providers are coming next. Connecting is OAuth-based and stays
        connected automatically — Vesta refreshes access in the background and never sends email
        without your explicit approval.
      </p>
    </section>
  );
}
