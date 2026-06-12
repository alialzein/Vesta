import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * System mail — operator alerts and the daily digest, sent through Resend
 * (env RESEND_API_KEY). This channel exists because user mail goes out via
 * each user's own Outlook, and the super admin deliberately has no mailbox.
 * NEVER used for user-facing email.
 *
 * Recipients default to the admin account email(s) (app_metadata.is_admin);
 * ALERT_EMAIL env overrides. Note: until a domain is verified in Resend,
 * Resend only delivers to the address that owns the Resend account.
 */

const RESEND_URL = 'https://api.resend.com/emails';

export async function adminAlertRecipients(): Promise<string[]> {
  const override = (process.env.ALERT_EMAIL ?? '').trim();
  if (override) return [override];
  try {
    const svc = createServiceClient();
    const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
    return (data?.users ?? [])
      .filter((u) => u.app_metadata?.is_admin === true && u.email)
      .map((u) => u.email as string);
  } catch {
    return [];
  }
}

export type SystemMailResult = { ok: boolean; error?: string };

export async function sendSystemEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<SystemMailResult> {
  const key = (process.env.RESEND_API_KEY ?? '').trim();
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set.' };
  if (input.to.length === 0) return { ok: false, error: 'No recipient.' };
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: (process.env.SYSTEM_MAIL_FROM ?? '').trim() || 'Vesta Operator <onboarding@resend.dev>',
        to: input.to,
        subject: input.subject.slice(0, 200),
        html: input.html,
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}
