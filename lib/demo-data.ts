/**
 * DEMO / PLACEHOLDER DATA ONLY — Phase 0.
 *
 * This file is the single, clearly-named home for hardcoded dashboard data.
 * It exists so the UI can render without any database, Microsoft Graph, or AI.
 *
 * In later phases, each export here is replaced by a Supabase query returning
 * the same shapes (see lib/types.ts, which mirrors docs/reference/database/schema-v1.md).
 * Nothing in this file should ever ship real user data or secrets.
 */

import type { CommandCard, ManagerMemory, MorningBrief, WorkItem } from './types';

export const DEMO_USER = {
  firstName: 'Ali',
  fullName: 'Ali Sabbagh',
  role: 'Managing Director',
  initials: 'A',
  // Display-only date string, matching the mockup. Not identity.
  todayLabel: 'Wednesday, 3 June',
};

/**
 * Display-only integration status for the topbar. Phase 0.1 is demo-only;
 * later phases derive this from a real Microsoft Graph connection.
 */
export const demoIntegrationStatus = {
  provider: 'Outlook',
  connected: true,
  detail: 'Synced 2 min ago',
};

/** Unread-style count shown on the topbar notification bell (demo only). */
export const demoNotificationCount = 3;

export const demoMorningBrief: MorningBrief = {
  headline: 'One blocker is putting a client relationship at risk.',
  body: 'You have <b>5 critical items</b>, <b>3 follow-ups</b>, and <b>1 approval blocking finance</b>. The top risk is the <b>Cedars Group</b> contract thread — they have followed up twice and need confirmation before 4 PM.',
  summaryLine:
    '5 critical · 3 follow-ups · 1 finance blocker. Cedars Group needs confirmation before 4 PM.',
};

/**
 * AI Command Center cards — quick AI-assisted flows shown under the Morning
 * Brief. Demo only: the CTAs do not run anything in Phase 0.1.
 */
export const demoCommandCards: CommandCard[] = [
  {
    id: 'cmd-clear-day',
    title: 'Clear My Day',
    description: 'Turn urgent decisions, follow-ups, and drafts into a focused action plan.',
    cta: 'Start',
    icon: 'sparkle',
    accent: 1,
  },
  {
    id: 'cmd-meeting-prep',
    title: 'Meeting Prep',
    description: "Prepare a one-page brief for today's important meetings.",
    cta: 'Prepare',
    icon: 'calendar',
    accent: 2,
  },
  {
    id: 'cmd-delegate',
    title: 'Delegate Work',
    description: 'Find tasks that can be delegated and draft the handoff messages.',
    cta: 'Review',
    icon: 'delegate',
    accent: 3,
  },
  {
    id: 'cmd-clean-inbox',
    title: 'Clean Inbox',
    description: 'Group FYI, newsletters, and low-risk messages so they do not interrupt you.',
    cta: 'Clean',
    icon: 'inbox',
    accent: 4,
  },
];

export const demoWorkItems: WorkItem[] = [
  {
    id: 'wi-cedars',
    title: 'Cedars Group contract approval',
    categories: ['critical', 'followup', 'waiting', 'decision', 'drafts'],
    source: 'outlook',
    person: 'Maya Khoury',
    personEmail: 'maya.khoury@cedarsgroup.com',
    summary: 'Maya requested approval before 4 PM. Two follow-ups detected.',
    priorityScore: 92,
    chips: [
      { label: 'Must reply', tone: 'red' },
      { label: '2 follow-ups', tone: 'amber' },
      { label: 'Client', tone: 'blue' },
    ],
    dueLabel: 'Due today',
    dueDetail: '4:00 PM',
    urgencyReason:
      'Cedars Group followed up twice. Last manager reply was 4 days ago. Deadline appears to be today at 4 PM. AI recommends replying or delegating legal review immediately.',
    nextBestAction: 'Approve the draft reply to Maya now, or send legal a quick review request.',
    suggestedDraft:
      'Hi Maya, thanks for following up. I am reviewing the final contract notes now and will confirm the approval status before 4 PM today. If anything needs legal confirmation, I will loop them in immediately.',
    riskChips: [
      { label: 'Reply today', tone: 'red' },
      { label: 'Risk: relationship delay', tone: 'amber' },
    ],
    memoryUsed: [
      { id: 'mem-1', type: 'vip', text: 'Cedars Group is a VIP client — always top priority.' },
      { id: 'mem-2', type: 'tone', text: 'Keep replies short, polite and direct.' },
    ],
    activity: [
      { label: 'Follow-ups', value: '2 from Maya' },
      { label: 'Last manager reply', value: '4 days ago' },
      { label: 'Due', value: 'Today · 4:00 PM' },
      { label: 'Reminder', value: 'Set for 2:00 PM' },
    ],
  },
  {
    id: 'wi-finance',
    title: 'Finance payment approval',
    categories: ['waiting', 'critical', 'decision', 'drafts'],
    source: 'teams',
    person: 'Rania Haddad',
    summary: 'Rania is blocked until you approve the supplier payment.',
    priorityScore: 88,
    chips: [
      { label: 'Blocking team', tone: 'red' },
      { label: 'Finance', tone: 'blue' },
    ],
    dueLabel: 'Waiting',
    dueDetail: '2 days',
    urgencyReason:
      'Finance is waiting for your approval to release the supplier payment. The same approval was mentioned in email and Teams, so the AI marked it as a blocker.',
    nextBestAction: 'Approve the payment so Rania can proceed, or delegate the sign-off to Rania.',
    suggestedDraft:
      'Hi Rania, approved from my side. Please proceed with the supplier payment and send me the confirmation once completed.',
    riskChips: [
      { label: 'Blocking team', tone: 'red' },
      { label: 'Finance', tone: 'blue' },
    ],
    memoryUsed: [
      {
        id: 'mem-3',
        type: 'delegation_rule',
        text: 'Finance approvals can be delegated to Rania.',
      },
    ],
    activity: [
      { label: 'Blocking', value: '1 person (Rania)' },
      { label: 'Channels', value: 'Email + Teams' },
      { label: 'Waiting', value: '2 days' },
      { label: 'Reminder', value: 'Not set' },
    ],
  },
  {
    id: 'wi-hiring',
    title: 'Hiring decision follow-up',
    categories: ['followup', 'waiting', 'promise', 'decision', 'drafts'],
    source: 'outlook',
    person: 'Lina Saad (HR)',
    summary: 'HR followed up after your promised confirmation date passed.',
    priorityScore: 81,
    chips: [
      { label: 'Promise detected', tone: 'amber' },
      { label: 'Follow-up', tone: 'amber' },
    ],
    dueLabel: 'Overdue',
    dueDetail: '1 day',
    overdue: true,
    urgencyReason:
      'HR asked for final decision on a candidate. You replied that you would confirm yesterday, but no final answer was sent.',
    nextBestAction: 'Send the approval to Lina to keep your promise and unblock the offer.',
    suggestedDraft:
      'Hi Lina, thanks for the reminder. Please proceed with the candidate. I approve moving to the offer stage.',
    riskChips: [
      { label: 'Promise at risk', tone: 'amber' },
      { label: 'Overdue', tone: 'red' },
    ],
    memoryUsed: [{ id: 'mem-2', type: 'tone', text: 'Keep replies short, polite and direct.' }],
    activity: [
      { label: 'Follow-ups', value: '1 from Lina (HR)' },
      { label: 'Promised by', value: 'Yesterday' },
      { label: 'Status', value: 'Overdue by 1 day' },
      { label: 'Reminder', value: 'Set for 11:00 AM' },
    ],
  },
  {
    id: 'wi-it-laptop',
    title: 'IT laptop purchase request',
    categories: ['delegate', 'drafts'],
    source: 'outlook',
    person: 'IT team',
    summary: 'Approval needed, but can be delegated for a budget check.',
    priorityScore: 63,
    chips: [
      { label: 'Can delegate', tone: 'blue' },
      { label: 'IT', tone: 'neutral' },
    ],
    dueLabel: 'This week',
    urgencyReason:
      'IT needs purchase confirmation. AI suggests delegating budget validation to Operations before you approve.',
    nextBestAction: 'Delegate the budget check to Omar in Operations before approving.',
    suggestedDraft:
      'Hi Omar, please check this laptop purchase request against the approved budget and send me your recommendation today.',
    riskChips: [{ label: 'Can delegate', tone: 'blue' }],
    memoryUsed: [
      {
        id: 'mem-5',
        type: 'delegation_rule',
        text: 'Budget checks under €5k can be delegated to Operations.',
      },
    ],
    activity: [
      { label: 'Requested by', value: 'IT team' },
      { label: 'Can delegate', value: 'Yes — Operations' },
      { label: 'Due', value: 'This week' },
      { label: 'Reminder', value: 'Not set' },
    ],
  },
  {
    id: 'wi-board',
    title: 'Board meeting preparation',
    categories: ['waiting'],
    source: 'calendar',
    person: 'Board of Directors',
    summary: 'Meeting tomorrow. AI prepared context from related emails.',
    priorityScore: 57,
    chips: [
      { label: 'Meeting prep', tone: 'neutral' },
      { label: 'Context ready', tone: 'blue' },
    ],
    dueLabel: 'Tomorrow',
    dueDetail: '10:00 AM',
    urgencyReason:
      'Calendar meeting tomorrow. AI collected recent emails, open decisions, and questions you may need to prepare.',
    nextBestAction:
      'Open the prepared one-page brief and review the open decisions before tomorrow.',
    suggestedDraft:
      'Meeting prep pack is ready: agenda summary, open decisions, recent emails, and suggested questions for the board discussion.',
    riskChips: [{ label: 'Context ready', tone: 'blue' }],
    memoryUsed: [
      {
        id: 'mem-6',
        type: 'preference',
        text: 'Prefer a one-page brief before board meetings.',
      },
    ],
    activity: [
      { label: 'Meeting', value: 'Tomorrow · 10:00 AM' },
      { label: 'Open decisions', value: '3 collected' },
      { label: 'Sources', value: '6 related emails' },
      { label: 'Reminder', value: 'Set for 5:00 PM today' },
    ],
  },
];

export const demoMemories: ManagerMemory[] = [
  { id: 'mem-1', type: 'vip', text: 'CEO, CFO and Cedars Group are VIP — always top priority.' },
  { id: 'mem-2', type: 'tone', text: 'Keep replies short, polite and direct.' },
  {
    id: 'mem-3',
    type: 'delegation_rule',
    text: 'Finance approvals can be delegated to Rania.',
  },
  {
    id: 'mem-4',
    type: 'do_not_do',
    text: 'Never send any email without my explicit approval.',
  },
];

/* (The demo chat data is gone — Ask Vesta is real now: see app/(shell)/chat,
 * components/chat/ChatView, and app/actions/chat.) */

/* ------------------------------------------------------------------ *
 * AI Command Center — demo content for the preview drawers.
 * Demo only: nothing here is fetched or sent.
 * ------------------------------------------------------------------ */

/** One-page Meeting Prep brief shown by the "Meeting Prep" command. */
/** "Clean Inbox" command — low-priority/FYI items the manager can safely batch. */
export const demoLowPriority = [
  { id: 'fyi-1', from: 'Office Facilities', subject: 'Parking maintenance next Tuesday' },
  { id: 'fyi-2', from: 'Industry Weekly', subject: 'Newsletter: regional market update' },
  { id: 'fyi-3', from: 'IT Service Desk', subject: 'Scheduled VPN upgrade (no action)' },
  { id: 'fyi-4', from: 'HR Announcements', subject: 'Reminder: wellbeing survey closes Friday' },
];
