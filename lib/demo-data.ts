/**
 * DEMO / PLACEHOLDER DATA ONLY — Phase 0.
 *
 * This file is the single, clearly-named home for hardcoded dashboard data.
 * It exists so the UI can render without any database, Microsoft Graph, or AI.
 *
 * In later phases, each export here is replaced by a Supabase query returning
 * the same shapes (see lib/types.ts, which mirrors docs/database/schema-v1.md).
 * Nothing in this file should ever ship real user data or secrets.
 */

import type { ChatMessage, KpiMetric, ManagerMemory, MorningBrief, WorkItem } from './types';

export const DEMO_USER = {
  firstName: 'Ali',
  fullName: 'Ali Sabbagh',
  role: 'Managing Director',
  initials: 'A',
  // Display-only date string, matching the mockup. Not identity.
  todayLabel: 'Wednesday, 3 June',
};

export const demoMorningBrief: MorningBrief = {
  headline: 'One blocker is putting a client relationship at risk.',
  body: 'You have <b>5 critical items</b>, <b>3 follow-ups</b>, and <b>1 approval blocking finance</b>. The top risk is the <b>Cedars Group</b> contract thread — they have followed up twice and need confirmation before 4 PM.',
  topUrgencyScore: 92,
};

export const demoKpis: KpiMetric[] = [
  { id: 'kpi-reply', value: 5, label: 'Must reply today', filter: 'critical' },
  { id: 'kpi-waiting', value: 8, label: 'People waiting on you', filter: 'waiting' },
  { id: 'kpi-followup', value: 3, label: 'Repeated follow-ups', filter: 'followup' },
  { id: 'kpi-drafts', value: 4, label: 'Drafts ready', filter: 'drafts' },
];

export const demoWorkItems: WorkItem[] = [
  {
    id: 'wi-cedars',
    title: 'Cedars Group contract approval',
    categories: ['critical', 'followup', 'waiting'],
    source: 'outlook',
    summary: 'Outlook · Maya requested approval before 4 PM. Two follow-ups detected.',
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
    suggestedDraft:
      'Hi Maya, thanks for following up. I am reviewing the final contract notes now and will confirm the approval status before 4 PM today. If anything needs legal confirmation, I will loop them in immediately.',
    riskChips: [
      { label: 'Reply today', tone: 'red' },
      { label: 'Risk: relationship delay', tone: 'amber' },
    ],
  },
  {
    id: 'wi-finance',
    title: 'Finance payment approval',
    categories: ['waiting', 'critical'],
    source: 'teams',
    summary: 'Teams + Outlook · Rania is blocked until you approve supplier payment.',
    priorityScore: 88,
    chips: [
      { label: 'Blocking team', tone: 'red' },
      { label: 'Finance', tone: 'blue' },
    ],
    dueLabel: 'Waiting',
    dueDetail: '2 days',
    urgencyReason:
      'Finance is waiting for your approval to release the supplier payment. The same approval was mentioned in email and Teams, so the AI marked it as a blocker.',
    suggestedDraft:
      'Hi Rania, approved from my side. Please proceed with the supplier payment and send me the confirmation once completed.',
    riskChips: [
      { label: 'Blocking team', tone: 'red' },
      { label: 'Finance', tone: 'blue' },
    ],
  },
  {
    id: 'wi-hiring',
    title: 'Hiring decision follow-up',
    categories: ['followup', 'waiting', 'promise'],
    source: 'outlook',
    summary: 'Outlook · HR followed up after your promised confirmation date passed.',
    priorityScore: 81,
    chips: [
      { label: 'Promise detected', tone: 'amber' },
      { label: 'Follow-up', tone: 'amber' },
    ],
    dueLabel: 'Overdue',
    dueDetail: '1 day',
    urgencyReason:
      'HR asked for final decision on a candidate. You replied that you would confirm yesterday, but no final answer was sent.',
    suggestedDraft:
      'Hi Lina, thanks for the reminder. Please proceed with the candidate. I approve moving to the offer stage.',
    riskChips: [
      { label: 'Promise at risk', tone: 'amber' },
      { label: 'Overdue', tone: 'red' },
    ],
  },
  {
    id: 'wi-it-laptop',
    title: 'IT laptop purchase request',
    categories: ['delegate'],
    source: 'outlook',
    summary: 'Outlook · Approval needed, but can be delegated for budget check.',
    priorityScore: 63,
    chips: [
      { label: 'Can delegate', tone: 'blue' },
      { label: 'IT', tone: 'neutral' },
    ],
    dueLabel: 'This week',
    urgencyReason:
      'IT needs purchase confirmation. AI suggests delegating budget validation to Operations before you approve.',
    suggestedDraft:
      'Hi Omar, please check this laptop purchase request against the approved budget and send me your recommendation today.',
    riskChips: [{ label: 'Can delegate', tone: 'blue' }],
  },
  {
    id: 'wi-board',
    title: 'Board meeting preparation',
    categories: ['waiting'],
    source: 'calendar',
    summary: 'Calendar · Meeting tomorrow. AI prepared context from related emails.',
    priorityScore: 57,
    chips: [
      { label: 'Meeting prep', tone: 'neutral' },
      { label: 'Context ready', tone: 'blue' },
    ],
    dueLabel: 'Tomorrow',
    dueDetail: '10:00 AM',
    urgencyReason:
      'Calendar meeting tomorrow. AI collected recent emails, open decisions, and questions you may need to prepare.',
    suggestedDraft:
      'Meeting prep pack is ready: agenda summary, open decisions, recent emails, and suggested questions for the board discussion.',
    riskChips: [{ label: 'Context ready', tone: 'blue' }],
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

export const demoChat: ChatMessage[] = [
  {
    id: 'chat-1',
    author: 'ai',
    html: "Morning, Ali — Vesta here. I've scanned <b>Outlook</b>, <b>Teams</b> and your calendar and kept everything in order. The <b>Cedars Group</b> approval is the one I'd handle first — want me to draft the reply?",
  },
  { id: 'chat-2', author: 'user', html: "What's blocking finance?" },
  {
    id: 'chat-3',
    author: 'ai',
    html: 'Rania needs your sign-off to release the <b>supplier payment</b>. It came up in both email and Teams, so I flagged it as a blocker. I can draft a note to her for your approval.',
  },
];

/** Mock canned replies for the assistant. Replaced by a real endpoint later. */
export const demoChatReplies: Record<string, string> = {
  'summarise my day':
    'Today: <b>5 critical</b>, <b>3 follow-ups</b>, <b>1 finance blocker</b>. Start with Cedars Group (due 4 PM), then approve Rania&apos;s payment.',
  'draft the cedars reply':
    'Drafted — &ldquo;Hi Maya, reviewing the final notes now, I&apos;ll confirm approval before 4 PM today and loop in legal if needed.&rdquo; Want me to refine or edit?',
  "who's waiting on me":
    '<b>8 people.</b> Most urgent: Maya (Cedars), Rania (Finance), Lina (HR). The first two are time-sensitive today.',
};

export const demoChatSuggestions = [
  'Summarise my day',
  'Draft the Cedars reply',
  "Who's waiting on me?",
];
