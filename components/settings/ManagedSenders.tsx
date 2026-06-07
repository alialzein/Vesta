'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeTriageRule, setSenderVip } from '@/app/settings/actions';
import { Icon } from '@/components/ui/Icon';

export type ManagedRule = { id: string; kind: 'mute' | 'allow'; value: string };
export type ManagedVip = { email: string; name: string | null };

/**
 * Settings → manage the triage rules the manager created via Mute / Always allow /
 * Mark VIP. View + remove them here; removing re-runs triage. Light/dark safe.
 */
export function ManagedSenders({ rules, vips }: { rules: ManagedRule[]; vips: ManagedVip[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const allows = rules.filter((r) => r.kind === 'allow');
  const mutes = rules.filter((r) => r.kind === 'mute');
  const empty = rules.length === 0 && vips.length === 0;

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-2.5 py-[4px] text-[12px] text-ink-soft';
  const x =
    'grid h-4 w-4 place-items-center rounded-full text-muted transition hover:text-red disabled:opacity-60';

  return (
    <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
      <h3 className="m-0 font-display text-[15px] font-semibold tracking-tight">Managed senders</h3>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">
        Rules you’ve set with Mute, Always allow, and Mark VIP. Vesta applies these every sync.
      </p>

      {empty ? (
        <p className="mt-3 rounded-[10px] border border-dashed border-line-strong bg-panel-2 px-3 py-2 text-[12.5px] text-muted">
          No custom rules yet. Use <strong>Always allow</strong> on the Hidden page, or{' '}
          <strong>Mute</strong> / <strong>Mark VIP</strong> on a message in your Inbox.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {vips.length > 0 && (
            <Group label="VIPs (always imported)">
              {vips.map((v) => (
                <span key={`vip-${v.email}`} className={chip}>
                  <Icon name="sparkle" className="h-3 w-3 text-accent" />
                  {v.name || v.email}
                  <button
                    type="button"
                    aria-label={`Remove VIP ${v.email}`}
                    disabled={pending}
                    onClick={() => run(() => setSenderVip(v.email, false))}
                    className={x}
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </Group>
          )}
          {allows.length > 0 && (
            <Group label="Always allowed">
              {allows.map((r) => (
                <span key={r.id} className={chip}>
                  {r.value}
                  <button
                    type="button"
                    aria-label={`Remove rule ${r.value}`}
                    disabled={pending}
                    onClick={() => run(() => removeTriageRule(r.id))}
                    className={x}
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </Group>
          )}
          {mutes.length > 0 && (
            <Group label="Muted">
              {mutes.map((r) => (
                <span key={r.id} className={chip}>
                  {r.value}
                  <button
                    type="button"
                    aria-label={`Remove rule ${r.value}`}
                    disabled={pending}
                    onClick={() => run(() => removeTriageRule(r.id))}
                    className={x}
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
