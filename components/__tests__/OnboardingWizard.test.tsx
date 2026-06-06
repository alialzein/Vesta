import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The wizard calls server actions on finish/skip — mock them (no server-only
// modules, and assert what the wizard sends).
const { completeOnboarding, skipOnboarding } = vi.hoisted(() => ({
  completeOnboarding: vi.fn(async () => {}),
  skipOnboarding: vi.fn(async () => {}),
}));
vi.mock('@/app/onboarding/actions', () => ({ completeOnboarding, skipOnboarding }));

import { OnboardingWizard } from '@/app/onboarding/OnboardingWizard';

describe('OnboardingWizard', () => {
  beforeEach(() => {
    completeOnboarding.mockClear();
    skipOnboarding.mockClear();
  });

  it('renders the first step with the AI core and a greeting', () => {
    render(<OnboardingWizard firstName="Ali" />);
    expect(screen.getByTestId('vesta-auth-core')).toBeInTheDocument();
    expect(screen.getByText(/Welcome,/i)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('What do you do?')).toBeInTheDocument();
  });

  it('skips onboarding from the first step', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard firstName="Ali" />);
    await user.click(screen.getByRole('button', { name: /Skip for now/i }));
    await waitFor(() => expect(skipOnboarding).toHaveBeenCalledTimes(1));
  });

  it('walks through all steps and submits answers on finish', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard firstName="Ali" />);

    // Step 1: role
    await user.type(screen.getByLabelText('Your role'), 'Managing Director');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 2: tone
    await user.click(screen.getByRole('button', { name: /short, polite and direct/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 3: VIPs
    await user.type(screen.getByLabelText('VIP people'), 'Cedars Group');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 4: topics
    await user.click(screen.getByRole('button', { name: 'Cybersecurity' }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 5: mailbox -> finish
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Enter Vesta/i }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'Managing Director',
        tone: expect.stringMatching(/short, polite and direct/i),
        vips: 'Cedars Group',
        topics: ['Cybersecurity'],
      }),
    );
  });
});
