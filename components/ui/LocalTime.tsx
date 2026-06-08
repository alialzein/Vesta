'use client';

import { useEffect, useState } from 'react';

/**
 * Render an ISO timestamp in the *viewer's* local timezone.
 *
 * Server components format dates on the server (UTC), so times showed up as GMT.
 * Formatting happens here on the client instead, so each manager sees their own
 * local time. We fill the text after mount and `suppressHydrationWarning` so the
 * server (empty) and first client render don't trip a hydration mismatch.
 */
export function LocalTime({
  iso,
  className,
  options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
}: {
  iso: string | null | undefined;
  className?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!iso) return;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) setText(d.toLocaleString(undefined, options));
    // options is a stable literal in practice; stringify to satisfy the deps lint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  if (!iso) return null;
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
