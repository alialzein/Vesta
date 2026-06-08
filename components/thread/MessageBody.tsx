'use client';

import { useRef, useState } from 'react';

/**
 * Render one email's full body.
 *
 * HTML emails are shown inside a **sandboxed iframe** with `allow-same-origin` but
 * NOT `allow-scripts` — so the original formatting (tables, signatures, inline
 * images) is preserved, no script in the email can ever run (XSS-safe), and the
 * parent can still measure the content to auto-size the frame. Plain-text emails
 * fall back to a pre block. The email renders on a white "paper" surface (emails
 * assume a light background); the surrounding card chrome stays theme-aware.
 */
export function MessageBody({ html, text }: { html: string | null; text: string | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(140);

  if (!html) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-[13.5px] leading-relaxed text-ink-soft">
        {text?.trim() || 'No message content was stored. Open in Outlook to read the full email.'}
      </pre>
    );
  }

  // Inline images embedded as cid: attachments aren't fetched yet, so they render
  // as broken-image icons — hide them rather than show a broken box. Remote (http)
  // images still load. The body sits on a "paper" surface (emails are authored for a
  // light background; this matches how Outlook/Gmail render them). We use a warm
  // off-white rather than stark #fff so it's softer against the dark-mode UI while
  // staying faithful in light mode.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><base target="_blank"><style>html{color-scheme:light}body{margin:0;padding:16px;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;color:#222;background:#f7f6f3;word-break:break-word}img{max-width:100%;height:auto}img[src^="cid:"],img:not([src]),img[src=""]{display:none}a{color:#2f7deb}table{max-width:100%}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={ref}
      title="Email content"
      // No allow-scripts: email JS can never execute. allow-popups lets target=_blank
      // links open in a new tab when the user clicks them.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={() => {
        const doc = ref.current?.contentDocument;
        if (doc) setHeight(Math.min(doc.documentElement.scrollHeight + 8, 4000));
      }}
      style={{ height }}
      className="w-full rounded-[10px] border border-line bg-[#f7f6f3]"
    />
  );
}
