import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/lib/theme';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is managed by ThemeProvider on the client; default to dark
    // so first paint matches the canonical mockup.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
