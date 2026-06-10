import type { PriorityBand, WorkItem, WorkItemCategory } from './types';

/**
 * Pure helpers for the dashboard. Kept separate from data and components so
 * they can be unit-tested (AGENTS.md: "Prefer small pure functions for
 * business logic" + "Add tests for pure logic").
 */

/** Map a 0–100 priority score to its color band. */
export function priorityBand(score: number): PriorityBand {
  if (score >= 85) return 'red';
  if (score >= 65) return 'amber';
  return 'green';
}

/**
 * Filter work items by a Today's Radar tab.
 * `all` returns everything; `overdue` matches items past their deadline;
 * otherwise match on the item's categories.
 */
export function filterWorkItems(
  items: WorkItem[],
  filter: WorkItemCategory | 'overdue' | 'all',
): WorkItem[] {
  if (filter === 'all') return items;
  if (filter === 'overdue') return items.filter((item) => item.overdue);
  return items.filter((item) => item.categories.includes(filter));
}
