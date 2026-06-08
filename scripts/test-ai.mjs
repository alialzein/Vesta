/**
 * Smoke-test the configured AI provider/model end-to-end with one sample email.
 * Verifies the key + model + call shape before relying on the full sync pipeline.
 *
 * Reads AI_PROVIDER / AI_MODEL / AI_API_KEY from .env.local.
 * Usage: node scripts/test-ai.mjs
 */
import { config } from 'dotenv';
import OpenAI from 'openai';

config({ path: '.env.local' });

const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL;
const provider = process.env.AI_PROVIDER ?? 'openai';
if (!apiKey || !model) {
  console.error('Missing AI_API_KEY or AI_MODEL in .env.local');
  process.exit(1);
}
if (provider !== 'openai') {
  console.error(`This smoke test only covers provider=openai (got "${provider}").`);
  process.exit(1);
}

const system = [
  "You are Vesta, an executive assistant that triages a manager's email.",
  'Analyze ONE email thread and return ONLY a JSON object — no prose, no code fences.',
  'Return exactly: {"summary": string, "category": "waiting"|"followup"|"fyi"|"decision"|"delegate"|"critical", "priority": 0-100, "deadline": "YYYY-MM-DD"|null, "nextAction": string, "reason": string}',
].join('\n');

const user = [
  'Subject: Re: Q3 budget approval',
  'From: Maya Chen',
  'Messages in thread: 3',
  'Times they have followed up: 2',
  'Currently waiting on the manager to reply: yes',
  '',
  'Latest message:',
  'Hi — following up again on the Q3 budget approval. We need your sign-off by Friday to keep the vendor contracts on track. Can you confirm?',
].join('\n');

const client = new OpenAI({ apiKey });

console.log(`Provider: ${provider}  Model: ${model}`);
const t0 = Date.now();
try {
  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const content = resp.choices?.[0]?.message?.content ?? '';
  console.log('\n--- raw output ---');
  console.log(content);
  console.log('\n--- usage ---');
  console.log(resp.usage);
  console.log(`\nOK in ${Date.now() - t0}ms`);
} catch (e) {
  console.error('\n✗ OpenAI call failed:', e?.status ?? '', e?.message ?? e);
  if (e?.error) console.error(e.error);
  process.exit(1);
}
