import 'server-only';
import { getAiConfig } from './config';
import { createOpenAiClient } from './providers/openai';
import type { AiClient } from './types';

/**
 * Provider factory. Returns the configured AI client, or null when AI isn't
 * configured (the whole AI path then no-ops, so non-AI environments still work).
 * Add an Anthropic adapter here later — the rest of the pipeline is unchanged.
 */
export function getAiClient(): AiClient | null {
  const cfg = getAiConfig();
  if (!cfg) return null;
  if (cfg.provider === 'openai') return createOpenAiClient(cfg.apiKey, cfg.model);
  // 'anthropic' adapter not implemented yet — falls through to no-op.
  return null;
}
