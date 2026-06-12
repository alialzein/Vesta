import type { MetadataRoute } from 'next';

/**
 * Web app manifest (Vesta Mobile pass, 2026-06-12) — makes Vesta installable
 * from the browser ("Add to Home Screen" on iPhone, install prompt on
 * Android/desktop Chrome). `display: standalone` launches it full-screen with
 * no browser chrome, like a native app. Deliberately NO offline service
 * worker: Vesta is a live mailbox console — a cache that serves a stale build
 * right after a deploy would hurt more than offline support helps.
 *
 * Served by Next at /manifest.webmanifest (linked automatically).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vesta — Your work, in order',
    short_name: 'Vesta',
    description:
      'Your AI chief of staff: decisions, follow-ups, and promises from your mailbox, in one ranked list.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f17',
    theme_color: '#0a0f17',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
