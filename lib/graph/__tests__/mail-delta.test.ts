import { describe, expect, it } from 'vitest';
import { splitDeltaItems, type GraphDeltaItem } from '../mail';

describe('splitDeltaItems', () => {
  it('separates live messages from removed ids', () => {
    const items: GraphDeltaItem[] = [
      { id: 'a', subject: 'hi' },
      { id: 'b', '@removed': { reason: 'deleted' } },
      { id: 'c', subject: 'yo' },
    ];
    const { messages, removedIds } = splitDeltaItems(items);
    expect(messages.map((m) => m.id)).toEqual(['a', 'c']);
    expect(removedIds).toEqual(['b']);
  });

  it('handles an empty page', () => {
    expect(splitDeltaItems([])).toEqual({ messages: [], removedIds: [] });
  });
});
