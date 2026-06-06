import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vesta — Your work, in order',
  description:
    'Vesta is a manager command center: decisions, follow-ups, and promises in one place.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Applies the persisted theme BEFORE first paint so there is no flash of the
 * wrong theme, and so a user's light/dark choice survives logout → login and
 * full reloads. Runs synchronously from localStorage ('vesta-theme'); falls back
 * to the dark default. ThemeProvider then keeps it in sync on the client.
 */
const themeInitScript = `
(function(){try{var t=localStorage.getItem('vesta-theme');
document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme defaults to dark for SSR; the inline script below overrides it
    // from the user's saved choice before paint. suppressHydrationWarning since
    // the attribute is set outside React.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
