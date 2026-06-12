import { describe, expect, it } from 'vitest';
import {
  dailySeries,
  heaviestCalls,
  rollupByKind,
  rowKind,
  type UsageRow,
} from '@/lib/admin/ai-usage';

function row(over: Partial<UsageRow> = {}): UsageRow {
  return {
    created_at: '2026-06-12T10:00:00Z',
    user_id: 'u1',
    feature: 'brief',
    model: 'gpt-5.4-mini',
    token_input: 100,
    token_output: 50,
    cost_estimate_usd: 0.001,
    error: null,
    metadata: null,
    ...over,
  };
}

describe('rowKind', () => {
  it('splits a feature by its metadata.kind when present', () => {
    expect(rowKind(row({ metadata: { kind: 'briefing_search' } }))).toBe('brief/briefing_search');
    expect(rowKind(row({ feature: 'draft' }))).toBe('draft');
  });
});

describe('rollupByKind', () => {
  it('separates the briefing whale from the cheap rank calls', () => {
    const rows = [
      row({ metadata: { kind: 'briefing_search' }, token_input: 17033, token_output: 2126 }),
      row({ metadata: { kind: 'briefing_rank' }, token_input: 3550, token_output: 1090 }),
      row({ metadata: { kind: 'briefing_rank' }, token_input: 3582, token_output: 735 }),
      row({ feature: 'chat', metadata: { kind: 'chat_turn' }, token_input: 2000, token_output: 60, error: 'boom' }),
    ];
    const ks = rollupByKind(rows, null);
    expect(ks[0]).toMatchObject({
      kind: 'brief/briefing_search',
      calls: 1,
      tokensIn: 17033,
      maxTokens: 19159,
    });
    expect(ks[1]).toMatchObject({ kind: 'brief/briefing_rank', calls: 2 });
    expect(ks[1].avgTokens).toBe(Math.round((3550 + 1090 + 3582 + 735) / 2));
    expect(ks[2]).toMatchObject({ kind: 'chat/chat_turn', errors: 1 });
  });
});

describe('dailySeries', () => {
  it('fills gaps with zero days, oldest first', () => {
    const now = new Date('2026-06-12T18:00:00Z');
    const series = dailySeries(
      [row({ created_at: '2026-06-12T10:00:00Z' }), row({ created_at: '2026-06-10T10:00:00Z', error: 'x' })],
      4,
      null,
      now,
    );
    expect(series.map((p) => p.date)).toEqual(['2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']);
    expect(series[1]).toMatchObject({ calls: 1, tokens: 150, errors: 1 });
    expect(series[2]).toMatchObject({ calls: 0, tokens: 0 });
  });
});

describe('heaviestCalls', () => {
  it('ranks by total tokens and keeps the kind label', () => {
    const heavy = heaviestCalls(
      [
        row({ token_input: 17033, token_output: 2126, metadata: { kind: 'briefing_search' } }),
        row({ token_input: 100, token_output: 1 }),
        row({ token_input: 0, token_output: 0 }),
      ],
      { input: 1, output: 2 },
      5,
    );
    expect(heavy).toHaveLength(2); // the zero-token row is dropped
    expect(heavy[0].kind).toBe('brief/briefing_search');
    expect(heavy[0].tokensIn).toBe(17033);
  });
});
