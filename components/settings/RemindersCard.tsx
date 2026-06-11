'use client';

import { useState } from 'react';
import { cancelReminder } from '@/app/actions/reminders';
import type { ReminderView } from '@/lib/reminders/data';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

/**
 * Settings → Scheduled reminders: every email reminder the manager set via a
 * confirmed chat order, with the next firing time and a Cancel. This is the
 * "where do I see / stop it" home the owner asked for — a reminder is never
 * an invisible background process.
 */
export function RemindersCard({ reminders }: { reminders: ReminderView[] }) {
  const { showToast } = useToast();
  const [items, setItems] = useState(reminders);
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleCancel(id: string) {
    setBusyId(id);
    const prev = items;
    setItems((list) => list.filter((r) => r.id !== id));
    void cancelReminder(id)
      .then((res) => {
        if (!res.ok) {
          setItems(prev);
          showToast(res.error ?? 'Could not cancel the reminder.');
        } else {
          showToast('Reminder cancelled — no more emails will be sent.');
        }
      })
      .finally(() => setBusyId(null));
  }

  return (
    <div className="rounded-[14px] border border-line bg-panel p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Icon name="clock" className="h-4 w-4 text-accent" />
        <b className="text-[14px] font-semibold text-ink">Scheduled reminders</b>
      </div>
      <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-muted">
        Email reminders you set through Ask Vesta (&ldquo;email me about this thread at 3pm,
        hourly, 3 times&rdquo;). Cancel stops a series — emails already sent stay sent.
      </p>

      {items.length === 0 ? (
        <p className="m-0 mt-3 rounded-[10px] border border-dashed border-line-strong bg-panel-2 px-3 py-3 text-[12.5px] text-muted">
          Nothing scheduled. Ask Vesta, e.g.{' '}
          <i>&ldquo;Email me a reminder about the Cedars thread tomorrow at 9am.&rdquo;</i>
        </p>
      ) : (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-[11px] border border-line bg-panel-2 px-3 py-[10px]"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-semibold text-ink">{r.subject}</p>
                <p className="m-0 mt-[2px] text-[11.5px] text-muted">
                  To {r.toEmail} · {r.scheduleLabel} · next{' '}
                  <LocalTime iso={r.nextSendAt} className="font-mono" />
                  {r.itemTitle ? ` · thread: ${r.itemTitle}` : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => handleCancel(r.id)}
                className="inline-flex items-center gap-[5px] rounded-[9px] border border-line bg-panel px-[10px] py-[6px] text-[12px] font-semibold text-muted transition hover:border-red hover:text-red disabled:opacity-60"
              >
                <Icon name="close" className="h-[11px] w-[11px]" />
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
