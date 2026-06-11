import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusMode } from '@/components/dashboard/FocusMode';
import { demoWorkItems } from '@/lib/demo-data';

const noop = () => {};

function renderFocus(over: Partial<Parameters<typeof FocusMode>[0]> = {}) {
  return render(
    <FocusMode
      open
      onClose={noop}
      items={demoWorkItems}
      onDone={noop}
      onSnooze={noop}
      onDraft={noop}
      {...over}
    />,
  );
}

describe('FocusMode', () => {
  it('shows the highest-priority item first with the one next step and progress', () => {
    renderFocus();
    const top = [...demoWorkItems].sort((a, b) => b.priorityScore - a.priorityScore)[0];
    expect(screen.getByRole('heading', { name: top.title })).toBeInTheDocument();
    expect(screen.getByText(top.nextBestAction)).toBeInTheDocument();
    expect(screen.getByText(`0 of ${demoWorkItems.length} handled`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark done/ })).toBeInTheDocument();
  });

  it('starts with the suggested focus item when given', () => {
    const notTop = [...demoWorkItems].sort((a, b) => a.priorityScore - b.priorityScore)[0];
    renderFocus({ initialItemId: notTop.id });
    expect(screen.getByRole('heading', { name: notTop.title })).toBeInTheDocument();
  });

  it('Skip moves to the next item and updates progress', async () => {
    const user = userEvent.setup();
    renderFocus();
    const sorted = [...demoWorkItems].sort((a, b) => b.priorityScore - a.priorityScore);

    await user.click(screen.getByRole('button', { name: /Skip/ }));
    expect(screen.getByRole('heading', { name: sorted[1].title })).toBeInTheDocument();
    expect(screen.getByText(`1 of ${demoWorkItems.length} handled`)).toBeInTheDocument();
  });

  it('calls the action handlers for the current item', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const onSnooze = vi.fn();
    renderFocus({ onDone, onSnooze });
    const top = [...demoWorkItems].sort((a, b) => b.priorityScore - a.priorityScore)[0];

    await user.click(screen.getByRole('button', { name: /Mark done/ }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ id: top.id }));

    await user.click(screen.getByRole('button', { name: /Tomorrow/ }));
    expect(onSnooze).toHaveBeenCalledWith(expect.objectContaining({ id: top.id }));
  });

  it('offers a second pass over skips, then a clean day-cleared state', async () => {
    const user = userEvent.setup();
    const one = demoWorkItems.slice(0, 1);
    renderFocus({ items: one });

    await user.click(screen.getByRole('button', { name: /Skip/ }));
    expect(screen.getByText('Nothing left but skips.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Go through skips/ }));
    expect(screen.getByRole('heading', { name: one[0].title })).toBeInTheDocument();
  });

  it('shows "Day cleared." when every planned item is gone', () => {
    // Open with one item, then the parent's optimistic update empties the list.
    const { rerender } = renderFocus({ items: demoWorkItems.slice(0, 1) });
    rerender(
      <FocusMode
        open
        onClose={noop}
        items={[]}
        onDone={noop}
        onSnooze={noop}
        onDraft={noop}
      />,
    );
    expect(screen.getByText('Day cleared.')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderFocus({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
