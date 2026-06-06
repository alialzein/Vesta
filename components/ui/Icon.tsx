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

/** The Vesta flame mark (filled). */
export function VestaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...props}>
      <path d="M12 2c.4 3-1.8 4.2-2.8 6.1-1 1.9-.6 4 .9 4.6.5-1.2.2-2.4 1-3.4.2 1.9 1.6 2.7 2.3 4.1.8 1.6.1 3.6-1.4 4.4 3.6.2 6-2 6-5.2 0-4.6-4.2-6.1-4.4-10.6-1.3 1-2 2.6-1.9 4.3-1.6-.9-2-2.6-1.7-4.3z" />
    </svg>
  );
}
