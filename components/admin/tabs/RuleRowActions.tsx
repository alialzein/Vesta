'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminToggleRule, adminDeleteRule } from '@/app/(admin)/admin/actions';

export function RuleRowActions({ ruleId, enabled }: { ruleId: string; enabled: boolean }) {
  return (
    <div className="flex justify-end gap-1.5">
      <ActionButton subtle run={() => adminToggleRule(ruleId, !enabled)}>
        {enabled ? 'Disable' : 'Enable'}
      </ActionButton>
      <ActionButton
        danger
        subtle
        confirm="Delete this rule? The user's triage stops applying it."
        run={() => adminDeleteRule(ruleId)}
      >
        Delete
      </ActionButton>
    </div>
  );
}
