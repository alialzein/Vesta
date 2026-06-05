import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodaysRadar } from '@/components/dashboard/TodaysRadar';
import { demoWorkItems } from '@/lib/demo-data';

describe('TodaysRadar', () => {
  it('renders all demo work items by default', () => {
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={() => {}} />);
    for (const item of demoWorkItems) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('filters items when a non-"all" tab is clicked', async () => {
    const user = userEvent.setup();
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Can delegate' }));

    // Only the delegate item remains; a critical-only item is gone.
    expect(screen.getByText('IT laptop purchase request')).toBeInTheDocument();
    expect(screen.queryByText('Finance payment approval')).not.toBeInTheDocument();
  });

  it('calls onSelect with the clicked item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={onSelect} />);

    const list = screen.getByText('Cedars Group contract approval').closest('button')!;
    await user.click(within(list).getByText('Cedars Group contract approval'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cedars Group contract approval' }),
    );
  });
});
