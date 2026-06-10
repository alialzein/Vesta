/**
 * Phase 7 — token → USD cost estimate.
 *
 * Prices are USD per 1M tokens. Models not in the table return `null` cost (tokens
 * are still tracked), so an unknown model never blocks analysis. Rate resolution
 * order: explicit `rates` (the admin panel's AI settings, fetched by the caller)
 * → env (`AI_PRICE_INPUT` / `AI_PRICE_OUTPUT`) → the built-in per-model table.
 */
import type { AiUsage } from './types';

export type CostRates = { input: number; output: number };

const PRICES: Record<string, CostRates> = {
  // Anthropic (from the Claude API reference)
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
  // OpenAI prices vary by model and aren't hardcoded here — set the prices in the
  // admin panel (AI Control Center → Model & budgets) or AI_PRICE_INPUT/OUTPUT.
};

function envPrice(): CostRates | null {
  const input = Number(process.env.AI_PRICE_INPUT);
  const output = Number(process.env.AI_PRICE_OUTPUT);
  if (Number.isFinite(input) && Number.isFinite(output)) return { input, output };
  return null;
}

/**
 * Estimated USD cost for one call, or null when the rate is unknown. Pass `rates`
 * (from the admin panel settings) to override env/table pricing.
 */
export function estimateCostUsd(
  model: string,
  usage: AiUsage,
  rates?: CostRates | null,
): number | null {
  const p = rates ?? envPrice() ?? PRICES[model];
  if (!p) return null;
  return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
}
