import { afterEach, describe, expect, it } from 'vitest';
import { estimateCostUsd } from '@/lib/ai/cost';

afterEach(() => {
  delete process.env.AI_PRICE_INPUT;
  delete process.env.AI_PRICE_OUTPUT;
});

describe('estimateCostUsd', () => {
  it('computes cost for a known model', () => {
    // Haiku: $1/1M in, $5/1M out → 1M in + 1M out = $6
    expect(estimateCostUsd('claude-haiku-4-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(6);
  });

  it('returns null for an unknown model with no env price', () => {
    expect(estimateCostUsd('gpt-5.4-mini', { inputTokens: 1000, outputTokens: 500 })).toBeNull();
  });

  it('uses env price override when set', () => {
    process.env.AI_PRICE_INPUT = '2';
    process.env.AI_PRICE_OUTPUT = '8';
    // 1M in × $2 + 1M out × $8 = $10
    expect(estimateCostUsd('gpt-5.4-mini', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(10);
  });

  it('explicit rates (admin panel) beat env and the built-in table', () => {
    process.env.AI_PRICE_INPUT = '2';
    process.env.AI_PRICE_OUTPUT = '8';
    const rates = { input: 1, output: 3 };
    // 1M × $1 + 1M × $3 = $4 (not the env $10, not Haiku's table $6)
    expect(
      estimateCostUsd('claude-haiku-4-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 }, rates),
    ).toBeCloseTo(4);
  });

  it('null rates fall back to env/table', () => {
    expect(
      estimateCostUsd('claude-haiku-4-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 }, null),
    ).toBeCloseTo(6);
  });
});
