import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VestaSplashScreen } from '@/components/dashboard/VestaSplashScreen';

/**
 * The splash is a demo-only timed overlay. Under NODE_ENV === 'test' its
 * duration is 0, so it renders its branded content and then calls onDone
 * immediately (it must never block tests).
 */
describe('VestaSplashScreen', () => {
  it('renders the branded title, subtitle, and a status message', () => {
    render(<VestaSplashScreen onDone={() => {}} />);

    const splash = screen.getByTestId('vesta-splash-screen');
    expect(splash).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('vesta-splash-core')).toBeInTheDocument();

    expect(screen.getByText('Vesta')).toBeInTheDocument();
    expect(screen.getByText('Your work, in order')).toBeInTheDocument();

    // The rotating status message renders one of the staged phrases.
    expect(screen.getByTestId('vesta-splash-message').textContent).toMatch(/\w+/);
  });

  it('exits (calls onDone) immediately in the test environment', () => {
    const onDone = vi.fn();
    render(<VestaSplashScreen onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
