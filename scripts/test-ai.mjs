/**
 * Smoke-test the configured AI provider/model on a few representative emails.
 * Verifies the key + model + call shape AND that categorization is sensible
 * (a person waiting on the manager -> "waiting"; automated notices -> "fyi").
 *
 * Mirrors the system prompt in lib/ai/context.ts. Reads AI_* from .env.local.
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
  'Be concise and concrete; write for the manager. Never invent facts not in the email.',
  'If no due date is stated or clearly implied, set deadline to null.',
  'Category — decide by WHO is waiting on whom, judged from the email content:',
  '- "waiting": a person is waiting for the MANAGER\'s reply, decision, or approval. A sender asking for an update or chasing the manager counts as "waiting".',
  '- "followup": the manager already responded and is now waiting on SOMEONE ELSE.',
  '- "decision": the manager must make an explicit choice or approval.',
  '- "delegate": best handed to a teammate.',
  '- "fyi": an automated notification, receipt, ticket/status update, account-verification, or no-reply/system message where no person is personally waiting on the manager.',
  '- "critical": urgent AND high-stakes (use sparingly).',
  'Rules: reminders from the sender mean THEY are waiting → "waiting", never "followup". Automated / no-reply / verify-your-account / closed-ticket messages are "fyi".',
  'Return: {"summary": string, "category": "waiting"|"followup"|"fyi"|"decision"|"delegate"|"critical", "priority": 0-100, "deadline": "YYYY-MM-DD"|null, "nextAction": string, "reason": string}',
].join('\n');

const cases = [
  {
    name: 'Human asking for an update (expect: waiting)',
    user: 'Subject: Test 2\nFrom: Ali Alzein\nReminders the sender has sent: 2\nThe latest message is from the sender; the manager has not replied to it yet.\n\nLatest message:\nHello, any update on the below?',
  },
  {
    name: 'Automated account verification (expect: fyi)',
    user: 'Subject: [Action required] Verify your TeamViewer account\nFrom: TeamViewer Account Activation\n\nLatest message:\nHi, Thank you for creating a TeamViewer account. For your security, please verify your account by clicking the button below. Happy connecting, TeamViewer Team',
  },
  {
    name: 'Closed support ticket notice (expect: fyi/followup)',
    user: 'Subject: Need More Help? | Case 628157276874257\nFrom: Meta Support\n\nLatest message:\nHi Ali, Thank you for reaching out about case 628157276874257. This ticket has been closed, but you can receive support by submitting a new case.',
  },
];

const client = new OpenAI({ apiKey });
console.log(`Provider: ${provider}  Model: ${model}\n`);

for (const c of cases) {
  try {
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: c.user },
      ],
    });
    const raw = resp.choices?.[0]?.message?.content ?? '';
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : {};
    console.log(`• ${c.name}`);
    console.log(`    category=${parsed.category}  priority=${parsed.priority}`);
    console.log(`    nextAction: ${parsed.nextAction}`);
    console.log(`    tokens: ${resp.usage?.prompt_tokens}+${resp.usage?.completion_tokens}\n`);
  } catch (e) {
    console.error(`✗ ${c.name}:`, e?.status ?? '', e?.message ?? e);
    process.exit(1);
  }
}
console.log('OK');
