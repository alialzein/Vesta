import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Export one user's data as a JSON download (portability / support — Wave 4).
 * Admin-gated (404 for anyone else, like every /admin surface) and audit-logged.
 * Tokens/secrets are never included; message bodies are (that's the point of a
 * portability export).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse(null, { status: 404 });

  const userId = params.id;
  const svc = createServiceClient();

  const [
    { data: profile },
    { data: settings },
    { data: mailboxes },
    { data: messages },
    { data: threads },
    { data: workItems },
    { data: drafts },
    { data: rules },
    { data: memories },
    { data: analyses },
  ] = await Promise.all([
    svc.from('profiles').select('*').eq('id', userId).maybeSingle(),
    svc.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    svc
      .from('mailboxes')
      .select('id, provider, mailbox_email, status, triage_mode, created_at')
      .eq('user_id', userId),
    svc.from('email_messages').select('*').eq('user_id', userId),
    svc.from('email_threads').select('*').eq('user_id', userId),
    svc.from('work_items').select('*').eq('user_id', userId),
    svc.from('draft_replies').select('*').eq('user_id', userId),
    svc.from('manager_rules').select('*').eq('user_id', userId),
    svc.from('manager_memories').select('*').eq('user_id', userId),
    svc.from('ai_analyses').select('*').eq('user_id', userId),
  ]);

  if (!profile) return new NextResponse(null, { status: 404 });

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: admin.email ?? admin.id,
    profile,
    settings: settings ?? null,
    mailboxes: mailboxes ?? [],
    email_messages: messages ?? [],
    email_threads: threads ?? [],
    work_items: workItems ?? [],
    draft_replies: drafts ?? [],
    manager_rules: rules ?? [],
    manager_memories: memories ?? [],
    ai_analyses: analyses ?? [],
  };

  await logAdminAction({
    actorId: admin.id,
    action: 'export_user_data',
    targetUserId: userId,
    metadata: { messages: payload.email_messages.length, workItems: payload.work_items.length },
  });

  const filename = `vesta-export-${(profile.email ?? userId).replace(/[^a-z0-9.@-]/gi, '_')}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
