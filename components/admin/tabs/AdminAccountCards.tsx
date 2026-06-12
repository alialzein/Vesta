'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { adminSetMaintenance } from '@/app/(admin)/admin/actions';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * The super admin's own controls (Admin Settings tab): password change,
 * optional TOTP two-factor, and the maintenance-mode switch. All client-side
 * auth flows use the browser Supabase client (anon key; the session is the
 * admin's own) — secrets never appear here.
 */

export function ChangePasswordCard() {
  const { showToast } = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (pw.length < 10) {
      showToast('Use at least 10 characters for the operator password.');
      return;
    }
    if (pw !== pw2) {
      showToast('The two passwords do not match.');
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setPw('');
    setPw2('');
    showToast('Password changed.');
  }

  const input =
    'w-full rounded-[10px] border border-line bg-panel-2 px-3 py-[9px] text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-accent';
  return (
    <div className="flex max-w-[420px] flex-col gap-[8px]">
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="New password (10+ characters)"
        aria-label="New password"
        autoComplete="new-password"
        className={input}
      />
      <input
        type="password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        placeholder="Repeat new password"
        aria-label="Repeat new password"
        autoComplete="new-password"
        className={input}
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !pw}
        className="self-start rounded-[10px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </div>
  );
}

type Factor = { id: string; friendly_name?: string | null; status: string };

export function TwoFactorCard() {
  const { showToast } = useToast();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setFactors([]);
      return;
    }
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function startEnroll() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Vesta operator',
    });
    setBusy(false);
    if (error || !data || data.type !== 'totp') {
      showToast(
        error?.message ??
          'Could not start enrollment — make sure TOTP is enabled in Supabase (Authentication → Multi-Factor).',
      );
      return;
    }
    const qr = data.totp.qr_code.startsWith('data:')
      ? data.totp.qr_code
      : `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`;
    setEnroll({ id: data.id, qr, secret: data.totp.secret });
  }

  async function verify() {
    if (!enroll || busy) return;
    setBusy(true);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (challenge.error || !challenge.data) {
      setBusy(false);
      showToast(challenge.error?.message ?? 'Challenge failed — try again.');
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.id,
      challengeId: challenge.data.id,
      code: code.trim(),
    });
    setBusy(false);
    if (error) {
      showToast('That code did not match — check your authenticator app and try again.');
      return;
    }
    setEnroll(null);
    setCode('');
    showToast('Two-factor is ON for this account.');
    void refresh();
  }

  async function unenroll(factorId: string) {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast('Two-factor removed.');
    void refresh();
  }

  const verified = (factors ?? []).filter((f) => f.status === 'verified');

  return (
    <div className="max-w-[480px]">
      {factors === null ? (
        <p className="m-0 text-[12.5px] text-muted">Checking two-factor status…</p>
      ) : verified.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-[7px] rounded-full border border-green/40 px-[12px] py-[6px] text-[12.5px] font-semibold text-green">
            <Icon name="shield" className="h-[14px] w-[14px]" />
            Two-factor is ON (authenticator app)
          </span>
          <button
            type="button"
            onClick={() => void unenroll(verified[0].id)}
            disabled={busy}
            className="rounded-[10px] border border-line bg-panel px-[12px] py-[7px] text-[12px] font-semibold text-muted transition hover:border-red/50 hover:text-red disabled:opacity-50"
          >
            Remove two-factor
          </button>
        </div>
      ) : enroll ? (
        <div className="flex flex-col gap-[10px]">
          <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
            Scan this with Google Authenticator / Authy, then enter the 6-digit code:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enroll.qr}
            alt="Two-factor enrollment QR code"
            className="h-[164px] w-[164px] rounded-[12px] border border-line bg-white p-2"
          />
          <p className="m-0 font-mono text-[11px] text-muted">
            Manual key: <span className="select-all">{enroll.secret}</span>
          </p>
          <div className="flex items-center gap-[8px]">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              aria-label="Two-factor code"
              className="w-[120px] rounded-[10px] border border-line bg-panel-2 px-3 py-[9px] text-center font-mono text-[14px] tracking-[0.2em] text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || code.trim().length < 6}
              className="rounded-[10px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[9px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify & turn on'}
            </button>
            <button
              type="button"
              onClick={() => setEnroll(null)}
              className="rounded-[10px] border border-line bg-panel px-[12px] py-[8px] text-[12px] font-semibold text-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void startEnroll()}
            disabled={busy}
            className="inline-flex items-center gap-[7px] rounded-[10px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[9px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Icon name="shield" className="h-[14px] w-[14px]" />
            Turn on two-factor
          </button>
          <span className="text-[12px] text-muted">
            Optional but recommended — this account controls everything.
          </span>
        </div>
      )}
    </div>
  );
}

export function MaintenanceSwitch({ initialOn }: { initialOn: boolean }) {
  const { showToast } = useToast();
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);

  async function flip() {
    if (busy) return;
    setBusy(true);
    const res = await adminSetMaintenance(!on);
    setBusy(false);
    showToast(res.message);
    if (res.ok) setOn(!on);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => void flip()}
        disabled={busy}
        className={[
          'relative h-[28px] w-[52px] rounded-full border transition',
          on ? 'border-amber bg-amber-soft' : 'border-line bg-panel-2',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[3px] h-[20px] w-[20px] rounded-full transition-all',
            on ? 'left-[27px] bg-amber' : 'left-[3px] bg-line-strong',
          ].join(' ')}
        />
        <span className="sr-only">Maintenance mode</span>
      </button>
      <span className={`text-[13px] font-semibold ${on ? 'text-amber' : 'text-ink-soft'}`}>
        {on ? 'Maintenance is ON — users see the “back soon” screen' : 'App is open to users'}
      </span>
    </div>
  );
}
