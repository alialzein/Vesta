import type { SVGProps } from 'react';

/** Stroked line-icon paths ported from the mockup. */
const PATHS = {
  home: <path d="M3 12l9-9 9 9M5 10v10h14V10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  reply: <path d="M4 4v16M4 4h13l-2 4 2 4H4" />,
  list: <path d="M4 5h16M4 12h16M4 19h10" />,
  delegate: <path d="M16 11a4 4 0 10-8 0M3 20a7 7 0 0114 0M17 13a5 5 0 014 5" />,
  brain: <path d="M12 3a9 9 0 100 18M12 3a4 4 0 010 8M12 3v8" />,
  trend: <path d="M3 17l5-5 4 4 8-8M21 8v5h-5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4-4" />
    </>
  ),
  chat: <path d="M21 11.5a8.4 8.4 0 01-9 8.4L3 21l1.1-3.6A8.4 8.4 0 1121 11.5z" />,
  moon: <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  inbox: <path d="M4 4h16v12H5.2L4 18z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0112 0M16 7h5M18.5 4.5v5" />
    </>
  ),
  refresh: <path d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006 5M4 15a8 8 0 0014 4" />,
  drafts: <path d="M12 20l-7-3V5l7 3 7-3v12z M12 8v12" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  info: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v5M12 16h.01" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  sparkle: <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  bell: <path d="M18 9a6 6 0 10-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9M10.5 20a1.8 1.8 0 003 0" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  panelRight: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />,
  snooze: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5M9 2h6l-6 5h6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  activity: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  signout: (
    <path d="M15 12H3m0 0l4-4m-4 4l4 4M10 7V5a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2h-6a2 2 0 01-2-2v-2" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

/** The Microsoft four-square mark (brand colors). Decorative; aria-hidden. */
export function MicrosoftLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}

/** The Vesta flame mark (filled). */
export function VestaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...props}>
      <path d="M12 2c.4 3-1.8 4.2-2.8 6.1-1 1.9-.6 4 .9 4.6.5-1.2.2-2.4 1-3.4.2 1.9 1.6 2.7 2.3 4.1.8 1.6.1 3.6-1.4 4.4 3.6.2 6-2 6-5.2 0-4.6-4.2-6.1-4.4-10.6-1.3 1-2 2.6-1.9 4.3-1.6-.9-2-2.6-1.7-4.3z" />
    </svg>
  );
}
