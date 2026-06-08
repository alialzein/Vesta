import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HiddenNudge } from '@/components/dashboard/HiddenNudge';

describe('HiddenNudge', () => {
  it('renders nothing when no mail was hidden', () => {
    const { container } = render(<HiddenNudge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link to the hidden list with a count when mail was hidden', () => {
    render(<HiddenNudge count={5} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/hidden');
    expect(link).toHaveTextContent('5 messages filtered this week');
  });

  it('uses the singular form for a single hidden message', () => {
    render(<HiddenNudge count={1} />);
    expect(screen.getByRole('link')).toHaveTextContent('1 message filtered this week');
  });
});
