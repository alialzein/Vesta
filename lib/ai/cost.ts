/**
 * Phase 7 — token → USD cost estimate.
 *
 * Prices are USD per 1M tokens. Models not in the table return `null` cost (tokens
 * are still tracked), so an unknown model never blocks analysis. Fill in / override
 * per model when known (later: from the admin panel). Overridable via env:
 *   AI_PRICE_INPUT  / AI_PRICE_OUTPUT  (USD per 1M tokens for the active model)
 */
import type { AiUsage } from './types';

const PRICES: Record<string, { input: number; output: number }> = {
  // Anthropic (from the Claude API reference)
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
  // OpenAI prices vary by model and aren't hardcoded here — set AI_PRICE_INPUT /
  // AI_PRICE_OUTPUT (or add an entry) once you know your model's rate.
};

function envPrice(): { input: number; output: number } | null {
  const input = Number(process.env.AI_PRICE_INPUT);
  const output = Number(process.env.AI_PRICE_OUTPUT);
  if (Number.isFinite(input) && Number.isFinite(output)) return { input, output };
  return null;
}

/** Estimated USD cost for one call, or null when the rate is unknown. */
export function estimateCostUsd(model: string, usage: AiUsage): number | null {
  const p = envPrice() ?? PRICES[model];
  if (!p) return null;
  return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
}
