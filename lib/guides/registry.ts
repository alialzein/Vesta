import type { IconName } from '@/components/ui/Icon';

/**
 * The public user-guide site map. Pure data (no fs) so it can be imported by
 * server and client components alike and unit-tested directly.
 *
 * The guide bodies live as plain Markdown in `docs/guides/*.md` — the same files
 * the team edits per the "guide-per-feature" rule. This registry decides which of
 * them are PUBLIC, their human title, which group they sit in, and the order. The
 * operator-only `admin-panel.md` and the folder `README.md` are intentionally
 * absent — they never reach the public site.
 *
 * To add a guide to the site: drop its `.md` in docs/guides/ and add one row here.
 */

export type GuideGroupId = 'start' | 'inbox' | 'radar' | 'work' | 'settings';

export type GuideGroup = { id: GuideGroupId; title: string; blurb: string };

/** Groups render top-to-bottom in the sidebar and on the overview page. */
export const GUIDE_GROUPS: GuideGroup[] = [
  { id: 'start', title: 'Get started', blurb: 'Sign in and connect your mailbox.' },
  { id: 'inbox', title: 'Your inbox', blurb: 'How mail flows in and gets filtered.' },
  { id: 'radar', title: 'Your radar', blurb: 'The dashboard, the AI, and replies.' },
  { id: 'work', title: 'Work smarter', blurb: 'Chat, calendar, briefs, and review.' },
  { id: 'settings', title: 'Settings & mobile', blurb: 'Make Vesta yours, on any device.' },
];

export type GuideMeta = {
  /** URL slug AND the `docs/guides/<slug>.md` filename (no extension). */
  slug: string;
  /** Short title for the sidebar / cards (the in-file H1 is the page title). */
  title: string;
  group: GuideGroupId;
  /** One-line description shown on the overview cards. */
  blurb: string;
  icon: IconName;
};

/**
 * Every public guide, in reading order. The flat order here also drives the
 * "Previous / Next" footer links, so keep it in the sequence a new user should
 * read it.
 */
export const GUIDES: GuideMeta[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    group: 'start',
    blurb: 'The animated welcome page, creating your account, and signing in.',
    icon: 'home',
  },
  {
    slug: 'onboarding',
    title: 'First-run setup',
    group: 'start',
    blurb: 'The short welcome wizard that teaches Vesta about you.',
    icon: 'sparkle',
  },
  {
    slug: 'connect-outlook',
    title: 'Connecting Outlook',
    group: 'start',
    blurb: 'Linking your mailbox so Vesta can read your email.',
    icon: 'mail',
  },
  {
    slug: 'email-sync',
    title: 'How email stays in sync',
    group: 'inbox',
    blurb: 'How Vesta keeps up with new and deleted mail automatically.',
    icon: 'refresh',
  },
  {
    slug: 'email-filtering',
    title: 'How Vesta filters your email',
    group: 'inbox',
    blurb: 'The two gates — what is hidden, what reaches your dashboard.',
    icon: 'shield',
  },
  {
    slug: 'inbox-and-hidden',
    title: 'Inbox & Hidden mail',
    group: 'inbox',
    blurb: 'Reading synced mail and reviewing what Vesta filtered out.',
    icon: 'inbox',
  },
  {
    slug: 'priorities-and-dashboard',
    title: 'Your dashboard & Priorities',
    group: 'radar',
    blurb: "Today's Radar, “Waiting on you”, quick actions, and ranking.",
    icon: 'list',
  },
  {
    slug: 'ai-analysis',
    title: "How Vesta's AI reads your email",
    group: 'radar',
    blurb: 'Summary, priority, deadline, next action — and the why, cost & privacy.',
    icon: 'brain',
  },
  {
    slug: 'draft-replies',
    title: 'Draft replies',
    group: 'radar',
    blurb: 'Let Vesta write a reply — edit it, then approve & send. Nothing sends without you.',
    icon: 'drafts',
  },
  {
    slug: 'memory-and-rules',
    title: 'Memory & Rules',
    group: 'radar',
    blurb: 'Teach Vesta VIPs, tone, delegation, and hard limits — used everywhere.',
    icon: 'edit',
  },
  {
    slug: 'ask-vesta',
    title: 'Ask Vesta',
    group: 'work',
    blurb: 'Chat that answers from your inbox and takes orders behind a Confirm tap.',
    icon: 'chat',
  },
  {
    slug: 'meetings',
    title: 'Meetings',
    group: 'work',
    blurb: 'Your Outlook calendar in Vesta — week, month, agenda — Join links and Prep.',
    icon: 'calendar',
  },
  {
    slug: 'daily-brief-and-focus',
    title: 'Daily Brief & Focus Mode',
    group: 'work',
    blurb: 'The AI-written morning brief and the full-screen Clear-My-Day pass.',
    icon: 'sun',
  },
  {
    slug: 'briefing',
    title: 'Briefing',
    group: 'work',
    blurb: 'Daily intelligence — news for your topics, with why-it-matters and actions.',
    icon: 'search',
  },
  {
    slug: 'weekly-review',
    title: 'Weekly Review',
    group: 'work',
    blurb: 'Your week at a glance — finished, replies sent, noise dismissed.',
    icon: 'trend',
  },
  {
    slug: 'vesta-on-your-phone',
    title: 'Vesta on your phone',
    group: 'settings',
    blurb: 'Install Vesta on your home screen — tab bar, dense rows, tap-to-act.',
    icon: 'panelRight',
  },
  {
    slug: 'settings-and-themes',
    title: 'Settings & appearance',
    group: 'settings',
    blurb: 'Managing your mailbox connection, filter mode, and light/dark theme.',
    icon: 'settings',
  },
];

/** Fast slug → metadata lookup. */
const BY_SLUG = new Map<string, GuideMeta>(GUIDES.map((g) => [g.slug, g]));

export function getGuideMeta(slug: string): GuideMeta | undefined {
  return BY_SLUG.get(slug);
}

export function isGuideSlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function getGroup(id: GuideGroupId): GuideGroup | undefined {
  return GUIDE_GROUPS.find((g) => g.id === id);
}

/** Guides bucketed by group, preserving both group order and guide order. */
export function guidesByGroup(): { group: GuideGroup; guides: GuideMeta[] }[] {
  return GUIDE_GROUPS.map((group) => ({
    group,
    guides: GUIDES.filter((g) => g.group === group.id),
  })).filter((b) => b.guides.length > 0);
}

/** Previous/next neighbours in reading order (for the article footer nav). */
export function neighbours(slug: string): { prev?: GuideMeta; next?: GuideMeta } {
  const i = GUIDES.findIndex((g) => g.slug === slug);
  if (i === -1) return {};
  return {
    prev: i > 0 ? GUIDES[i - 1] : undefined,
    next: i < GUIDES.length - 1 ? GUIDES[i + 1] : undefined,
  };
}
