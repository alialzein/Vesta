'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DraftRecipient, DraftView, WorkItem } from '@/lib/types';
import type { DraftCapabilities } from '@/lib/drafts/capabilities';
import { DRAFT_TONES, type DraftTone } from '@/lib/ai/draft';
import { buildReplyRecipients, normalizeRecipient } from '@/lib/email/reply';
import {
  generateDraft,
  ensureBlankDraft,
  saveDraft,
  sendDraft,
  discardDraft,
} from '@/app/actions/drafts';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Phase 9 — Draft Reply composer.
 *
 * The manager reviews an AI-written reply, edits it, and explicitly approves it to
 * send. Nothing sends without that approval (AGENTS.md / safety-rules.md). On open
 * it auto-generates a draft when AI is on (or opens an empty editor when it's off),
 * shows AI + sensitive-topic cautions, the recipients, a tone selector, and the
 * required safety copy. Theme-aware (light + dark).
 */

const TONE_LABEL: Record<DraftTone, string> = {
  professional: 'Professional',
  warm: 'Warm',
  concise: 'Concise',
  formal: 'Formal',
  friendly: 'Friendly',
};

type Phase = 'idle' | 'generating' | 'starting' | 'saving' | 'sending';

type DraftComposerProps = {
  open: boolean;
  onClose: () => void;
  item: WorkItem | null;
  capabilities: DraftCapabilities;
  /** Called after a successful send so the dashboard can clear the item. */
  onSent?: (workItemId: string) => void;
};

export function DraftComposer({ open, onClose, item, capabilities, onSent }: DraftComposerProps) {
  const { showToast } = useToast();

  const [draft, setDraft] = useState<DraftView | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [subject, setSubject] = useState('');
  const [tone, setTone] = useState<DraftTone>('professional');
  const [replyAll, setReplyAll] = useState(false);
  const [instruction, setInstruction] = useState('');
  // Editable recipients — the manager can see every address, remove any, add more.
  const [to, setTo] = useState<DraftRecipient[]>([]);
  const [cc, setCc] = useState<DraftRecipient[]>([]);
  const [bcc, setBcc] = useState<DraftRecipient[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [needsReconnect, setNeedsReconnect] = useState(false);

  // Run the open-time setup once per (item, open) so it doesn't loop or re-generate.
  const handledKey = useRef<string | null>(null);

  const canDraft = !!item?.canDraft;
  const busy = phase !== 'idle';
  const isDraftOnly = capabilities.sendMode === 'draft_only';

  /** Seed the editor from a draft view. */
  function seedFrom(d: DraftView | null) {
    setDraft(d);
    setBodyText(d?.bodyText ?? '');
    setSubject(d?.subject ?? item?.title ?? '');
    if (d?.tone && DRAFT_TONES.includes(d.tone as DraftTone)) setTone(d.tone as DraftTone);
    setReplyAll(d?.replyAll ?? false);
    setTo(d?.to ?? []);
    setCc(d?.cc ?? []);
    setBcc(d?.bcc ?? []);
  }

  /**
   * Toggling reply-all re-seeds To/Cc from the original message's participants
   * (computed locally with the same logic the server uses). Bcc is left untouched.
   * Falls back to just flipping the flag when we don't have the raw participants.
   */
  function toggleReplyAll(next: boolean) {
    setReplyAll(next);
    const p = draft?.threadParticipants;
    if (!p) return;
    const r = buildReplyRecipients(
      { from: p.from, to: p.to, cc: p.cc },
      draft?.managerEmail ? [draft.managerEmail] : [],
      { replyAll: next },
    );
    setTo(r.to);
    setCc(r.cc);
  }

  /** Add a typed address to a recipient list (validated + de-duplicated). */
  function addRecipient(
    field: 'to' | 'cc' | 'bcc',
    raw: string,
    setter: (fn: (prev: DraftRecipient[]) => DraftRecipient[]) => void,
  ) {
    const parsed = normalizeRecipient(raw);
    if (!parsed) {
      showToast('Enter a valid email address.');
      return false;
    }
    setter((prev) =>
      prev.some((r) => (r.email ?? '').toLowerCase() === (parsed.email ?? '').toLowerCase())
        ? prev
        : [...prev, parsed],
    );
    return true;
  }

  async function runGenerate(currentTone: DraftTone, currentReplyAll: boolean, instr?: string) {
    if (!item) return;
    setPhase('generating');
    setNeedsReconnect(false);
    const res = await generateDraft(item.id, {
      tone: currentTone,
      replyAll: currentReplyAll,
      instruction: instr,
    });
    setPhase('idle');
    if (res.ok && res.draft) {
      seedFrom(res.draft);
      showToast('Draft ready — review before sending.');
    } else {
      showToast(res.error ?? 'Could not generate a draft.');
    }
  }

  async function runEnsureBlank() {
    if (!item) return;
    setPhase('starting');
    const res = await ensureBlankDraft(item.id, { replyAll });
    setPhase('idle');
    if (res.ok && res.draft) seedFrom(res.draft);
    else if (res.error) showToast(res.error);
  }

  // On open: seed from any existing draft; otherwise auto-generate (AI on) or open a
  // blank editor backed by a real draft row (AI off) so the manager can write + send.
  useEffect(() => {
    if (!open || !item) return;
    const key = `${item.id}:${open}`;
    if (handledKey.current === key) return;
    handledKey.current = key;

    if (item.draft) {
      seedFrom(item.draft);
      return;
    }
    seedFrom(null);
    if (!canDraft) return;
    if (capabilities.aiEnabled) void runGenerate(tone, replyAll, undefined);
    else void runEnsureBlank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  // Forget the handled key when the drawer closes, so re-opening re-seeds.
  useEffect(() => {
    if (!open) handledKey.current = null;
  }, [open]);

  async function handleSave() {
    if (!item) return;
    if (!bodyText.trim()) return showToast('Write a reply first.');
    setPhase('saving');
    // No draft row yet (AI off, nothing typed before) — create one, then save.
    let id = draft?.id;
    if (!id) {
      const ensured = await ensureBlankDraft(item.id, { replyAll });
      if (ensured.ok && ensured.draft) {
        setDraft(ensured.draft);
        id = ensured.draft.id;
      }
    }
    if (!id) {
      setPhase('idle');
      return showToast('Could not save the draft.');
    }
    const res = await saveDraft(id, { bodyText, subject, replyAll, to, cc, bcc });
    setPhase('idle');
    if (res.ok && res.draft) {
      setDraft(res.draft);
      showToast('Draft saved.');
    } else {
      showToast(res.error ?? 'Could not save the draft.');
    }
  }

  async function handleSend() {
    if (!item) return;
    if (!bodyText.trim()) return showToast('Write a reply before sending.');
    if (to.length === 0) return showToast('Add at least one recipient in the To field.');
    let id = draft?.id;
    setPhase('sending');
    if (!id) {
      const ensured = await ensureBlankDraft(item.id, { replyAll });
      if (ensured.ok && ensured.draft) {
        setDraft(ensured.draft);
        id = ensured.draft.id;
      }
    }
    if (!id) {
      setPhase('idle');
      return showToast('Could not prepare the reply to send.');
    }
    const res = await sendDraft(id, { bodyText, subject, replyAll, to, cc, bcc });
    setPhase('idle');
    if (res.ok) {
      showToast(isDraftOnly ? 'Saved to your Outlook drafts.' : 'Reply sent.');
      if (!isDraftOnly) {
        onSent?.(item.id);
        onClose();
      } else if (res.draft) {
        setDraft(res.draft);
      }
    } else {
      setNeedsReconnect(res.needsReconnect === true);
      showToast(res.error ?? 'Could not send the reply.');
    }
  }

  async function handleDiscard() {
    if (draft?.id) await discardDraft(draft.id);
    seedFrom(null);
    handledKey.current = null;
    onClose();
  }

  const sensitive = draft?.sensitiveTopics ?? [];
  const warnings = draft?.warnings ?? [];
  const reviewFlagged = draft?.requiresHumanReview || sensitive.length > 0;

  const sendLabel = isDraftOnly ? 'Save to Outlook drafts' : 'Approve & Send';
  const reconnectNeeded =
    capabilities.mailboxConnected && !capabilities.sendingEnabled && !isDraftOnly;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Drawer — a touch wider than the shared Drawer to fit the editor comfortably. */}
      <aside
        role="dialog"
        aria-label="Draft reply"
        aria-hidden={!open}
        className={[
          'fixed right-0 top-0 z-[110] flex h-screen w-full max-w-[520px] flex-col border-l border-line bg-panel-solid shadow-panel transition-transform duration-300 ease-ease',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line px-[18px] py-4">
          <span className="mt-px grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-accent-soft text-accent">
            <Icon name="edit" className="h-[17px] w-[17px]" />
          </span>
          <div className="min-w-0">
            <b className="block font-display text-[17px] font-semibold tracking-tight text-ink">
              Draft reply
            </b>
            <small className="mt-px block truncate text-[12px] text-muted">
              {item?.title ?? 'Select an item'}
            </small>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="ml-auto grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="v-scroll flex flex-1 flex-col gap-[14px] overflow-y-auto px-[18px] py-5">
          {!canDraft ? (
            <EmptyNote
              icon="info"
              title="Nothing to reply to"
              body="This item is a task or note, not an email thread, so there's no message to answer."
            />
          ) : (
            <>
              {/* Reply-all toggle — re-seeds To/Cc from the thread's participants. */}
              <label className="flex cursor-pointer items-center gap-[10px] text-[12.5px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={replyAll}
                  disabled={busy}
                  onChange={(e) => toggleReplyAll(e.target.checked)}
                  className="h-[15px] w-[15px] accent-[color:var(--accent)]"
                />
                Reply to everyone on the thread (reply all)
              </label>

              {/* Editable recipients — see every address, remove any, add more. */}
              <RecipientField
                label="To"
                recipients={to}
                disabled={busy}
                onAdd={(raw) => addRecipient('to', raw, setTo)}
                onRemove={(i) => setTo((p) => p.filter((_, idx) => idx !== i))}
              />
              <RecipientField
                label="Cc"
                recipients={cc}
                disabled={busy}
                placeholder="Add Cc…"
                onAdd={(raw) => addRecipient('cc', raw, setCc)}
                onRemove={(i) => setCc((p) => p.filter((_, idx) => idx !== i))}
              />
              <RecipientField
                label="Bcc"
                recipients={bcc}
                disabled={busy}
                placeholder="Add Bcc…"
                onAdd={(raw) => addRecipient('bcc', raw, setBcc)}
                onRemove={(i) => setBcc((p) => p.filter((_, idx) => idx !== i))}
              />

              {/* Subject */}
              <Field label="Subject">
                <input
                  type="text"
                  value={subject}
                  disabled={busy}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-[10px] border border-line bg-panel-2 px-3 py-[9px] text-[13px] text-ink outline-none transition focus:border-accent disabled:opacity-60"
                />
              </Field>

              {/* Tone selector (applies on Generate / Regenerate) */}
              {capabilities.aiEnabled && (
                <Field label="Tone">
                  <div className="flex flex-wrap gap-[6px]">
                    {DRAFT_TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={busy}
                        onClick={() => setTone(t)}
                        className={[
                          'rounded-full px-[11px] py-[5px] text-[11.5px] font-semibold transition disabled:opacity-50',
                          t === tone
                            ? 'bg-accent text-white shadow-[0_4px_12px_rgba(47,125,235,0.3)]'
                            : 'border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-accent',
                        ].join(' ')}
                      >
                        {TONE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {/* Body editor */}
              <Field label="Reply">
                {phase === 'generating' ? (
                  <GeneratingState />
                ) : (
                  <textarea
                    value={bodyText}
                    disabled={busy}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={11}
                    placeholder={
                      capabilities.aiEnabled
                        ? 'Vesta will write a draft here…'
                        : 'Write your reply…'
                    }
                    className="w-full resize-y rounded-[12px] border border-line bg-panel-2 px-3 py-[11px] text-[13.5px] leading-relaxed text-ink outline-none transition focus:border-accent disabled:opacity-60"
                  />
                )}
              </Field>

              {/* Optional instruction for the AI */}
              {capabilities.aiEnabled && (
                <Field label="Tell Vesta how to reply (optional)">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={instruction}
                      disabled={busy}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g. politely decline, ask for the deck, confirm Tuesday"
                      className="min-w-0 flex-1 rounded-[10px] border border-line bg-panel-2 px-3 py-[9px] text-[12.5px] text-ink outline-none transition focus:border-accent disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runGenerate(tone, replyAll, instruction || undefined)}
                      className="inline-flex flex-none items-center gap-[6px] rounded-[10px] border border-line-strong bg-panel-solid px-3 py-[9px] text-[12px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <Icon name="sparkle" className="h-[14px] w-[14px]" />
                      {draft ? 'Redo' : 'Write'}
                    </button>
                  </div>
                </Field>
              )}

              {/* Cautions: model warnings + deterministic sensitive-topic net */}
              {(warnings.length > 0 || sensitive.length > 0) && (
                <div className="rounded-[12px] border border-amber/40 bg-amber-soft/60 p-[12px]">
                  <span className="inline-flex items-center gap-[6px] font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-amber">
                    <Icon name="info" className="h-[14px] w-[14px]" />
                    Check before sending
                  </span>
                  <ul className="mt-[7px] flex flex-col gap-[5px] text-[12.5px] leading-snug text-ink-soft">
                    {sensitive.length > 0 && (
                      <li>
                        Sensitive topic ({sensitive.join(', ')}) — review wording carefully.
                      </li>
                    )}
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Required safety copy */}
              <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
                <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
                {reviewFlagged
                  ? 'AI drafted this reply and flagged it for careful review. Please review before sending.'
                  : 'AI drafted this reply. Please review before sending. Vesta will not send anything without your explicit approval.'}
              </p>

              {reconnectNeeded && (
                <div className="rounded-[12px] border border-line bg-panel-2 p-[12px] text-[12.5px] text-ink-soft">
                  Sending isn&apos;t enabled yet.{' '}
                  <Link href="/settings" prefetch className="font-semibold text-accent hover:underline">
                    Reconnect Outlook
                  </Link>{' '}
                  to let Vesta send on your behalf. You can still save the draft.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {canDraft && (
          <div className="flex flex-wrap items-center gap-[9px] border-t border-line bg-panel-2 px-[18px] py-4">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={busy}
              className="mr-auto inline-flex items-center gap-[6px] rounded-[11px] px-[10px] py-[8px] text-[12.5px] font-semibold text-muted transition hover:text-red disabled:opacity-50"
            >
              <Icon name="close" className="h-[14px] w-[14px]" />
              Discard
            </button>

            {capabilities.aiEnabled && (
              <button
                type="button"
                onClick={() => void runGenerate(tone, replyAll, instruction || undefined)}
                disabled={busy}
                className="inline-flex items-center gap-[6px] rounded-[11px] border border-line-strong bg-panel-solid px-[12px] py-[8px] text-[12.5px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <Icon name="refresh" className={`h-[14px] w-[14px] ${phase === 'generating' ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-[6px] rounded-[11px] border border-line-strong bg-panel-solid px-[12px] py-[8px] text-[12.5px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <Icon name="check" className="h-[14px] w-[14px]" />
              Save
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={busy || !bodyText.trim()}
              className="inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" className="h-[14px] w-[14px]" />
              {phase === 'sending' ? 'Sending…' : sendLabel}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

/**
 * An editable recipient field: every address shows as a removable chip, and a
 * trailing input adds a new one (Enter / comma to commit). Backspace on an empty
 * input removes the last chip. The manager can see and control exactly who a reply
 * reaches — To, Cc, and Bcc.
 */
function RecipientField({
  label,
  recipients,
  onAdd,
  onRemove,
  disabled,
  placeholder,
}: {
  label: string;
  recipients: DraftRecipient[];
  onAdd: (raw: string) => boolean;
  onRemove: (index: number) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  function commit() {
    const v = value.trim();
    if (!v) return;
    if (onAdd(v)) setValue('');
  }
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-[6px] rounded-[10px] border border-line bg-panel-2 px-[8px] py-[7px] focus-within:border-accent">
        {recipients.map((r, i) => (
          <span
            key={`${r.email}-${i}`}
            className="inline-flex max-w-full items-center gap-[6px] rounded-full bg-accent-soft px-[9px] py-[3px] text-[12px] text-accent"
          >
            <span className="max-w-[210px] truncate" title={r.name ? `${r.name} <${r.email}>` : (r.email ?? '')}>
              {r.email}
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${r.email}`}
              onClick={() => onRemove(i)}
              className="grid h-[15px] w-[15px] flex-none place-items-center rounded-full text-accent/70 transition hover:bg-accent hover:text-white disabled:opacity-50"
            >
              <Icon name="close" className="h-[10px] w-[10px]" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          disabled={disabled}
          aria-label={`Add ${label} recipient`}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !value && recipients.length > 0) {
              onRemove(recipients.length - 1);
            }
          }}
          onBlur={commit}
          placeholder={recipients.length === 0 ? (placeholder ?? 'Add an email…') : ''}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-[2px] text-[13px] text-ink outline-none disabled:opacity-60"
        />
      </div>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-line-strong bg-panel-2 text-center">
      <span className="relative grid h-9 w-9 place-items-center">
        <span className="animate-vesta-ripple absolute h-9 w-9 rounded-full bg-accent-soft" aria-hidden="true" />
        <Icon name="sparkle" className="animate-vesta-pulse relative h-[20px] w-[20px] text-accent" />
      </span>
      <span className="text-[13px] font-semibold text-ink-soft">Vesta is writing your draft…</span>
      <span className="text-[11.5px] text-muted">Reading the thread and matching your tone.</span>
    </div>
  );
}

function EmptyNote({ icon, title, body }: { icon: 'info'; title: string; body: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-panel-2 p-6 text-center">
      <Icon name={icon} className="h-6 w-6 text-muted" />
      <b className="text-[14px] font-semibold text-ink">{title}</b>
      <p className="max-w-[300px] text-[12.5px] leading-snug text-muted">{body}</p>
    </div>
  );
}
