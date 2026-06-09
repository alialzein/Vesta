'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminToggleMemory, adminDeleteMemory } from '@/app/(admin)/admin/actions';

export function MemoryRowActions({ memoryId, active }: { memoryId: string; active: boolean }) {
  return (
    <div className="flex justify-end gap-1.5">
      <ActionButton subtle run={() => adminToggleMemory(memoryId, !active)}>
        {active ? 'Deactivate' : 'Activate'}
      </ActionButton>
      <ActionButton
        danger
        subtle
        confirm="Delete this memory? The AI stops using it as context."
        run={() => adminDeleteMemory(memoryId)}
      >
        Delete
      </ActionButton>
    </div>
  );
}
