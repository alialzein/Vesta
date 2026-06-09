import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isGraphConfigured } from '@/lib/graph/oauth';
import { hasSendScope } from '@/lib/graph/tokens';
import { OutlookCard, type OutlookStatus } from '@/components/settings/OutlookCard';
import { ManagedSenders, type ManagedRule } from '@/components/settings/ManagedSenders';
import { Icon } from '@/components/ui/Icon';

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
    <main className="v-scroll mx-auto h-screen w-full max-w-[760px] overflow-y-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to dashboard"
          className="grid h-9 w-9 place-items-center rounded-[11px] border border-line bg-panel text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevronLeft" className="h-[18px] w-[18px]" />
        </Link>
        <div>
          <h1 className="m-0 font-display text-[26px] font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-[13px] text-muted">
            Connect your mailbox and manage how Vesta works for you.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
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
    </main>
  );
}
