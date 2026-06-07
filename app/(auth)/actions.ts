'use server';

import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; message?: string } | null;

/**
 * Cookie that asks the dashboard to play the branded splash once. Set on login,
 * cleared by the dashboard when the splash finishes — so the splash always shows
 * on login but never when navigating between pages afterwards.
 */
function markSplashForLogin(): void {
  cookies().set('vesta_show_splash', '1', { path: '/', maxAge: 300, sameSite: 'lax' });
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  markSplashForLogin();
  redirect(redirectedFrom && redirectedFrom.startsWith('/') ? redirectedFrom : '/');
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

  markSplashForLogin();
  redirect('/');
}

/** Sign out and return to the login page. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
