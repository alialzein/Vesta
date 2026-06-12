'use client';

import { useState, useTransition } from 'react';
import { completeOnboarding, skipOnboarding, type OnboardingAnswers } from './actions';
import { VestaAuthCore } from '@/app/(auth)/VestaAuthCore';
import { Icon } from '@/components/ui/Icon';

/**
 * First-run onboarding wizard (Phase 2c).
 *
 * A short, skippable full-screen flow that teaches Vesta about the manager. The
 * answers are saved as the user's own `manager_memories` (approval-first; no AI
 * calls). On finish/skip the server stamps `profiles.onboarded_at` so it is not
 * shown again. Light/dark safe (theme tokens). Demo-safe.
 */

const TOPIC_OPTIONS = [
  'AI & technology',
  'Cybersecurity',
  'Business & markets',
  'Industry news',
  'Regulations',
  'Competitors',
  'Clients',
  'Hiring & HR',
  'Finance & economy',
];

const TONE_OPTIONS = [
  'Keep replies short, polite and direct.',
  'Warm and relationship-focused.',
  'Formal and precise.',
];

type StepDef = { key: string; title: string; subtitle: string };

const STEPS: StepDef[] = [
  { key: 'role', title: 'What do you do?', subtitle: 'So Vesta understands your context.' },
  { key: 'tone', title: 'How should Vesta sound?', subtitle: 'Your preferred reply style.' },
  { key: 'vips', title: 'Who matters most?', subtitle: 'People Vesta should always prioritise.' },
  {
    key: 'topics',
    title: 'What should Vesta watch?',
    subtitle: 'Topics for your future briefing.',
  },
  { key: 'mailbox', title: 'Connect your mailbox', subtitle: 'So Vesta can organise real work.' },
];

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [tone, setTone] = useState('');
  const [vips, setVips] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function finish() {
    const answers: OnboardingAnswers = { role, tone, vips, topics };
    startTransition(() => {
      void completeOnboarding(answers);
    });
  }

  function skip() {
    startTransition(() => {
      void skipOnboarding();
    });
  }

  return (
    // Own scroll container (body is overflow:hidden) — the wizard is taller
    // than a phone screen, and `min-h-screen` alone made it unscrollable
    // (mobile-scroll fix, 2026-06-12). The min-h-full flex wrapper centers
    // when it fits, scrolls from the top when it doesn't.
    <main className="v-scroll relative h-[100dvh] overflow-y-auto overflow-x-hidden">
      <div className="relative z-[1] mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <VestaAuthCore />
          <div>
            <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight">
              Welcome, <span className="grad-text italic">{firstName}</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              A few quick questions so Vesta works the way you do. You can skip and edit later.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4 flex items-center gap-[6px]" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-[4px] flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent' : 'bg-line'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius)] border border-line bg-panel p-6 shadow-glow backdrop-blur-[16px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="m-0 mt-1 font-display text-[20px] font-semibold tracking-tight">
            {current.title}
          </h2>
          <p className="mt-1 text-[13px] text-muted">{current.subtitle}</p>

          <div className="mt-4">
            {current.key === 'role' && (
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Managing Director, Operations & Finance"
                aria-label="Your role"
                className="w-full rounded-[11px] border border-line bg-field px-3 py-[11px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
            )}

            {current.key === 'tone' && (
              <div className="flex flex-col gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTone(opt)}
                    aria-pressed={tone === opt}
                    className={`rounded-[11px] border px-3 py-[11px] text-left text-[13px] transition ${
                      tone === opt
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line bg-field text-ink-soft hover:border-line-strong'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {current.key === 'vips' && (
              <textarea
                value={vips}
                onChange={(e) => setVips(e.target.value)}
                placeholder="Names or clients, one per line (e.g. CEO, CFO, Cedars Group)"
                aria-label="VIP people"
                rows={4}
                className="w-full resize-none rounded-[11px] border border-line bg-field px-3 py-[11px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
            )}

            {current.key === 'topics' && (
              <div className="flex flex-wrap gap-2">
                {TOPIC_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    aria-pressed={topics.includes(t)}
                    className={`rounded-full border px-[12px] py-[7px] text-[12.5px] font-semibold transition ${
                      topics.includes(t)
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-field text-ink-soft hover:border-line-strong'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {current.key === 'mailbox' && (
              <div className="rounded-[12px] border border-dashed border-line-strong bg-panel-2 p-4 text-center">
                <Icon name="mail" className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
                <p className="mt-2 text-[13px] font-semibold text-ink">Outlook, Gmail, or IMAP</p>
                <p className="mt-1 text-[12px] leading-snug text-muted">
                  Mailbox connection arrives in the next phase. You&apos;ll be able to connect from
                  Settings — Vesta never sends email without your approval.
                </p>
              </div>
            )}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (step === 0 ? skip() : setStep((s) => s - 1))}
              disabled={isPending}
              className="rounded-[11px] px-3 py-[10px] text-[13px] font-semibold text-muted transition hover:text-ink disabled:opacity-60"
            >
              {step === 0 ? 'Skip for now' : 'Back'}
            </button>

            {last ? (
              <button
                type="button"
                onClick={finish}
                disabled={isPending}
                className="flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-accent to-accent-2 px-[18px] py-[11px] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(47,125,235,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
              >
                {isPending && (
                  <Icon
                    name="refresh"
                    className="animate-spin-slow h-[16px] w-[16px]"
                    aria-hidden="true"
                  />
                )}
                {isPending ? 'Setting up…' : 'Enter Vesta'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={isPending}
                className="flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-accent to-accent-2 px-[18px] py-[11px] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(47,125,235,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
              >
                Continue
                <Icon name="chevronRight" className="h-[16px] w-[16px]" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-muted">
          You can edit everything later in Memory &amp; Rules. This teaches Vesta — it never sends
          anything on its own.
        </p>
      </div>
    </main>
  );
}
