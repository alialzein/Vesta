'use client';

import { useRef, useState } from 'react';
import { linkifySegments, simpleEmailText } from '@/lib/email/render';

/**
 * Render one email's body, picking the clearest safe presentation:
 *
 * 1. **Simple HTML** (plain correspondence — no tables/images/backgrounds)
 *    renders as THEME-NATIVE text: readable in dark and light mode, links
 *    clickable, nothing from the email can execute or restyle the app
 *    (extraction is text-only — lib/email/render).
 * 2. **Rich HTML** (marketing, branded layouts) keeps the sandboxed iframe
 *    with `allow-same-origin` but NOT `allow-scripts`, on a white "paper"
 *    surface — that HTML is authored for a light background.
 * 3. Plain-text bodies render as a pre block.
 */
export function MessageBody({ html, text }: { html: string | null; text: string | null }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(140);

  const native = html ? simpleEmailText(html) : null;
  if (!html || native) {
    const value = native ?? text?.trim();
    return (
      <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink-soft">
        {value
          ? linkifySegments(value).map((seg, i) =>
              seg.type === 'link' ? (
                <a
                  key={i}
                  href={seg.value}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent underline underline-offset-2 hover:brightness-110"
                >
                  {seg.value}
                </a>
              ) : (
                <span key={i}>{seg.value}</span>
              ),
            )
          : 'No message content was stored. Open in Outlook to read the full email.'}
      </div>
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
