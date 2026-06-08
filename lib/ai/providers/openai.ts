import 'server-only';
import OpenAI from 'openai';
import type { AiClient, AiRawResult } from '../types';

/**
 * OpenAI adapter (Phase 7). Minimal, broad-compatibility chat call: no temperature
 * or token caps (some newer models reject them), and we rely on a strong
 * "return ONLY JSON" instruction + a defensive parser rather than a provider-
 * specific structured-output mode. Returns raw text + token usage.
 */
export function createOpenAiClient(apiKey: string, model: string): AiClient {
  const client = new OpenAI({ apiKey });
  return {
    provider: 'openai',
    model,
    async complete({ system, user }): Promise<AiRawResult> {
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      const content = resp.choices[0]?.message?.content ?? '';
      if (!content.trim()) throw new Error('OpenAI returned an empty response');
      return {
        content,
        usage: {
          inputTokens: resp.usage?.prompt_tokens ?? 0,
          outputTokens: resp.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
