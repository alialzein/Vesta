'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { recordLoginEvent, loginContextFromHeaders } from '@/lib/admin/audit';

export type AuthState = { error?: string; message?: string } | null;

/**
 * After a successful login, land on the dashboard with a one-shot `?splash=1`.
 * The dashboard plays the branded splash for that param and strips it from the
 * URL on mount, so the splash shows on login but never on internal navigation.
 * (A cookie used to gate this, but the App Router's client cache replayed it.)
 */
function loginTarget(redirectedFrom: string): string {
  const target = redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/';
  return target === '/' ? '/?splash=1' : target;
}

/** Sign in with email + password. */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectedFrom = String(formData.get('redirectedFrom') ?? '');

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Audit the sign-in (best-effort; feeds the admin Audit tab + per-user history).
  if (data.user) await recordLoginEvent(data.user.id, 'password', loginContextFromHeaders(headers()));

  redirect(loginTarget(redirectedFrom));
}

/** Create a new account. Sends a confirmation email if confirmations are on. */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  // Confirm-password is also validated client-side; re-check here so the
  // server never trusts the client alone.
  if (confirmPassword && password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const origin = headers().get('origin') ?? '';
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, there is no active session yet.
  if (data.session === null) {
    return {
      message: 'Check your email to confirm your account, then sign in.',
    };
  }

  redirect('/?splash=1');
}

/** Sign out and return to the login page. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
