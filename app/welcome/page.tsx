import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/LandingPage';

/**
 * Public marketing landing. Signed-out visitors to `/` are sent here by the
 * middleware (signed-in users never see it — the middleware bounces them to the
 * app/admin just like /login). Static, client-animated; no data fetching.
 */
export const metadata: Metadata = {
  title: 'Vesta — Your work, in order',
  description:
    'Vesta reads your inbox, filters the noise, and hands you a ranked radar of the few things that actually need you — with reasons you can read. Nothing sends without your approval.',
};

export default function WelcomePage() {
  return <LandingPage />;
}
