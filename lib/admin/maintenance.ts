import 'server-only';
import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Maintenance mode — one switch (app_settings.feature_flags.maintenance) that
 * locks the app for normal users while the operator works. The admin console
 * keeps running. Enforced in requireUser (every app page/action passes
 * through it); cache() keeps it to ONE cheap single-row read per request.
 */
export const isMaintenanceOn = cache(async (): Promise<boolean> => {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from('app_settings')
      .select('feature_flags')
      .eq('id', true)
      .maybeSingle();
    const flags = (data?.feature_flags ?? {}) as Record<string, unknown>;
    return flags.maintenance === true;
  } catch {
    return false; // never lock everyone out because a read failed
  }
});
