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

  it('filters items when the "Can delegate" chip is clicked', async () => {
    const user = userEvent.setup();
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole('tab', { name: /Can delegate/ }));

    // Only the delegate item remains; a critical-only item is gone.
    expect(screen.getByText('IT laptop purchase request')).toBeInTheDocument();
    expect(screen.queryByText('Finance payment approval')).not.toBeInTheDocument();
  });

  it('filters to Decisions', async () => {
    const user = userEvent.setup();
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole('tab', { name: /Decisions/ }));

    expect(screen.getByText('Cedars Group contract approval')).toBeInTheDocument();
    // Board prep is not a decision item.
    expect(screen.queryByText('Board meeting preparation')).not.toBeInTheDocument();
  });

  it('shows each chip with its live count and hides empty slices entirely', () => {
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={() => {}} />);

    // "All" carries the open-items count (the old KPI strip's "Open Items").
    expect(
      screen.getByRole('tab', { name: new RegExp(`^All ${demoWorkItems.length}$`) }),
    ).toBeInTheDocument();
    // One vocabulary: the `waiting` slice is "Waiting on you", not "Blockers".
    expect(screen.getByRole('tab', { name: /Waiting on you/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Blockers/ })).not.toBeInTheDocument();
    // The one overdue demo item keeps the red-count Overdue chip alive.
    expect(screen.getByRole('tab', { name: /Overdue 1/ })).toBeInTheDocument();
    // Empty slices keep no chip (10 permanent chips for 5 items was the noise
    // the declutter pass removed): no demo item is a task or waiting-on-them.
    expect(screen.queryByRole('tab', { name: /Tasks/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Waiting on them/ })).not.toBeInTheDocument();
  });

  it('calls onSelect with the clicked item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TodaysRadar items={demoWorkItems} selectedId={null} onSelect={onSelect} />);

    const row = screen.getByText('Cedars Group contract approval').closest('button')!;
    await user.click(within(row).getByText('Cedars Group contract approval'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cedars Group contract approval' }),
    );
  });
});
