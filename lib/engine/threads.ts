/**
 * Thread & follow-up engine (Phase 6) — pure, deterministic, no I/O.
 *
 * Given the messages of one email conversation, compute who is waiting on whom,
 * how many unanswered follow-ups there are, and a heuristic urgency score. These
 * functions are unit-tested and used by the sync to populate email_threads flags
 * and create work_items. AI summaries/priority refine this later (Phase 7).
 */

export type ThreadMessage = {
  direction: 'inbound' | 'outbound';
  /** ISO timestamp (received for inbound, sent for outbound). */
  at: string | null;
};

export type ThreadState = {
  latestAt: string | null;
  latestInboundAt: string | null;
  latestOutboundAt: string | null;
  /** Latest message is inbound → the sender is waiting on the manager. */
  isWaitingOnManager: boolean;
  /** Latest message is outbound → the manager is waiting on the other party. */
  isWaitingOnOther: boolean;
  /** Inbound messages received after the manager's last outbound reply. */
  inboundAfterLastOutboundCount: number;
  /** Repeated unanswered inbound pressure (>=2 inbound since last reply). */
  followupCount: number;
};

function maxAt(messages: ThreadMessage[], dir?: 'inbound' | 'outbound'): string | null {
  let max: string | null = null;
  for (const m of messages) {
    if (dir && m.direction !== dir) continue;
    if (m.at && (!max || m.at > max)) max = m.at;
  }
  return max;
}

/** Compute the conversation's waiting/follow-up state from its messages. */
export function computeThreadState(messages: ThreadMessage[]): ThreadState {
  const latestAt = maxAt(messages);
  const latestInboundAt = maxAt(messages, 'inbound');
  const latestOutboundAt = maxAt(messages, 'outbound');

  // The direction of the single most recent message decides who's waiting.
  let latestDirection: 'inbound' | 'outbound' | null = null;
  if (latestAt) {
    latestDirection = latestInboundAt === latestAt ? 'inbound' : 'outbound';
    // If both share the timestamp (rare), prefer inbound (needs attention).
    if (latestInboundAt === latestAt) latestDirection = 'inbound';
    else if (latestOutboundAt === latestAt) latestDirection = 'outbound';
  }

  const inboundAfterLastOutboundCount = messages.filter(
    (m) => m.direction === 'inbound' && m.at && (!latestOutboundAt || m.at > latestOutboundAt),
  ).length;

  const isWaitingOnManager = latestDirection === 'inbound';
  const isWaitingOnOther = latestDirection === 'outbound';

  return {
    latestAt,
    latestInboundAt,
    latestOutboundAt,
    isWaitingOnManager,
    isWaitingOnOther,
    inboundAfterLastOutboundCount,
    followupCount: Math.max(0, inboundAfterLastOutboundCount - 1),
  };
}

export type ScoreOptions = {
  /** The sender/counterparty is a VIP (people.is_vip). */
  isVip?: boolean;
  /** "Now" for recency math; defaults to Date.now(). Injectable for tests. */
  now?: number;
};

const DAY = 24 * 60 * 60 * 1000;

/** Heuristic 0–100 urgency score (pre-AI). Higher = more attention needed. */
export function scoreThread(state: ThreadState, opts: ScoreOptions = {}): number {
  const now = opts.now ?? Date.now();
  let score = state.isWaitingOnManager ? 45 : 20;

  // Recency of the latest message.
  if (state.latestAt) {
    const ageDays = (now - new Date(state.latestAt).getTime()) / DAY;
    if (ageDays <= 1) score += 25;
    else if (ageDays <= 3) score += 16;
    else if (ageDays <= 7) score += 8;
  }

  // Repeated unanswered follow-ups add pressure.
  score += Math.min(state.inboundAfterLastOutboundCount * 8, 24);

  if (opts.isVip) score += 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ThreadCategory = 'waiting' | 'followup' | 'fyi';

/** Map thread state to a work-item category. */
export function categorizeThread(state: ThreadState): ThreadCategory {
  if (!state.isWaitingOnManager) return 'fyi';
  return state.followupCount > 0 ? 'followup' : 'waiting';
}
