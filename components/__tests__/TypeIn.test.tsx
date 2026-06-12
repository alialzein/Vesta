import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeIn } from '@/components/dashboard/TypeIn';

describe('TypeIn', () => {
  it('renders the initial text instantly (no animation on first render)', () => {
    render(<TypeIn text="Maya is waiting on your reply." />);
    expect(screen.getByText('Maya is waiting on your reply.')).toBeInTheDocument();
    // No word spans on the instant path.
    expect(document.querySelector('.vesta-word-in')).toBeNull();
  });

  it('keeps the FULL text in the DOM when the text changes (words animate, content is whole)', () => {
    const { rerender, container } = render(<TypeIn text="deterministic brief" />);
    rerender(<TypeIn text="Zahraa needs the meeting decision today." />);

    // Every word is present immediately — screen readers and the layout never
    // see a half-written sentence; only opacity/transform animate per word.
    expect(container.textContent).toBe('Zahraa needs the meeting decision today.');
    expect(container.querySelectorAll('.vesta-word-in').length).toBe(6);
  });

  it('passes the className through', () => {
    const { container } = render(<TypeIn text="hello" className="text-red" />);
    expect(container.querySelector('.text-red')).not.toBeNull();
  });
});
