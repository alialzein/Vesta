import Link from 'next/link';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { isGraphConfigured } from '@/lib/graph/oauth';
import { OutlookCard, type OutlookStatus } from '@/components/settings/OutlookCard';
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
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('status, provider_email, connected_at')
    .eq('provider', 'microsoft')
    .maybeSingle();

  const status: OutlookStatus = {
    connected: integration?.status === 'connected',
    email: integration?.provider_email ?? null,
    connectedAt: integration?.connected_at ?? null,
    configured: isGraphConfigured(),
  };

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
        <p className="text-[12px] leading-relaxed text-muted">
          Gmail and other (IMAP) providers are coming next. Connecting is OAuth-based and stays
          connected automatically — Vesta refreshes access in the background and never sends email
          without your explicit approval.
        </p>
      </section>
    </main>
  );
}
