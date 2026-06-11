'use client';

import { useEffect } from 'react';
import { reportDetectedTimezone } from '@/app/(shell)/settings/actions';

/**
 * Reports the device's IANA timezone to the server once per page load, so
 * `profiles.timezone` follows the manager automatically (travel included).
 * The server ignores the report when the manager pinned a timezone in
 * Settings. Renders nothing; failures are silent (timezone falls back to the
 * stored value, worst case UTC).
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) void reportDetectedTimezone(tz).catch(() => {});
    } catch {
      /* non-blocking */
    }
  }, []);
  return null;
}
