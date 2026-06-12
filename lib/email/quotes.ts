/**
 * Quoted-history splitting for the thread reading room (pure, unit tested).
 *
 * Reply emails re-paste the whole earlier conversation under a separator
 * ("From: … Sent: …", "On … wrote:", gmail_quote, …). The thread page already
 * shows every message as its own card, so that pasted history is pure
 * duplication — we split it off and render it behind a "Show quoted history"
 * toggle instead of a wall of repeated text.
 *
 * The split is conservative: if no known marker is found, or everything
 * before the marker is invisible (a pure forward), the body stays whole.
 */

export type SplitBody = {
  main: string;
  /** The quoted tail (markers included), or null when nothing was split. */
  quoted: string | null;
};

/** Substring markers that begin the quoted block in HTML bodies. Matched
 *  case-insensitively; the cut backs up to the start of the enclosing tag. */
const HTML_MARKERS = [
  'id="divrplyfwdmsg"', // Outlook (web + new desktop) reply separator
  'id="appendonsend"', // new Outlook: replies are appended after this div
  'class="gmail_quote', // Gmail (also matches gmail_quote_container)
  'class="yahoo_quoted', // Yahoo
  'class="outlookmessageheader"', // older Outlook
  'border-top:solid #e1e1e1 1.0pt', // classic Outlook desktop separator <div>
  'border-top:1px solid #d0d0d0', // Vesta's own reply builder (lib/email/reply)
  '<b>from:</b>', // generic pasted "From:/Sent:" header block
  '-----original message-----',
];

/** Line-anchored markers for plain-text bodies. */
const TEXT_MARKERS: RegExp[] = [
  /^-{3,}\s*Original Message\s*-{3,}/im,
  /^_{10,}\s*$/m, // Outlook's plain-text ruler
  /\r?\nFrom:\s[^\n]+\r?\n(?:Sent|Date|To):\s/i, // pasted header block
  /^On .{0,200} wrote:\s*$/m, // Gmail/Apple Mail
];

/** Visible-text length of an HTML fragment (tags + entities stripped). */
function visibleLength(html: string): number {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|\s+/g, '')
    .length;
}

export function splitQuotedHtml(html: string): SplitBody {
  const lower = html.toLowerCase();
  let cut = -1;
  for (const marker of HTML_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;
    // Back up to the opening "<" of the tag carrying the marker, so the
    // quoted part starts at a tag boundary (plain-text markers stay as-is).
    const tagStart = marker.startsWith('-') ? idx : lower.lastIndexOf('<', idx);
    const pos = tagStart === -1 ? idx : tagStart;
    if (cut === -1 || pos < cut) cut = pos;
  }
  if (cut <= 0) return { main: html, quoted: null };
  const main = html.slice(0, cut);
  // A pure forward has no visible content of its own — keep it whole.
  if (visibleLength(main) === 0) return { main: html, quoted: null };
  return { main, quoted: html.slice(cut) };
}

export function splitQuotedText(text: string): SplitBody {
  let cut = -1;
  for (const re of TEXT_MARKERS) {
    const m = re.exec(text);
    if (!m) continue;
    if (cut === -1 || m.index < cut) cut = m.index;
  }
  if (cut <= 0) return { main: text, quoted: null };
  const main = text.slice(0, cut);
  if (main.trim().length === 0) return { main: text, quoted: null };
  return { main: main.trimEnd(), quoted: text.slice(cut) };
}
