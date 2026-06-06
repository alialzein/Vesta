'use client';

import { DEMO_USER, demoIntegrationStatus } from '@/lib/demo-data';

/**
 * Bottom of the sidebar: a subtle Outlook connection status (moved out of the
 * topbar) + the profile card. Simplified to icons/avatar when collapsed.
 */
export function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const status = demoIntegrationStatus;

  return (
    <div className={['mt-auto flex flex-col gap-2', collapsed ? 'items-center' : ''].join(' ')}>
      {/* Outlook connection status — subtle, demo-only. */}
      <div
        className={[
          'flex items-center rounded-[12px] border border-[color:var(--side-card-border)] bg-[color:var(--side-card)] text-[color:var(--side-muted)]',
          collapsed ? 'h-9 w-9 justify-center' : 'gap-[8px] px-[12px] py-[8px]',
        ].join(' ')}
        title={`${status.provider} ${status.connected ? 'connected' : 'disconnected'} · ${status.detail}`}
      >
        <span
          className={`h-[7px] w-[7px] flex-none rounded-full ${
            status.connected
              ? 'bg-green shadow-[0_0_0_3px_var(--green-soft)]'
              : 'bg-red shadow-[0_0_0_3px_var(--red-soft)]'
          }`}
          aria-hidden="true"
        />
        {!collapsed && (
          <span className="text-[11.5px] font-semibold">
            {status.provider} {status.connected ? 'Connected' : 'Offline'}
          </span>
        )}
      </div>

      {/* Profile card */}
      <div
        className={[
          'flex items-center rounded-[15px] border border-[color:var(--side-card-border)] bg-[color:var(--side-card)]',
          collapsed ? 'justify-center p-2' : 'gap-3 p-[13px]',
        ].join(' ')}
        title={collapsed ? `${DEMO_USER.fullName} · ${DEMO_USER.role}` : undefined}
      >
        <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 text-[15px] font-bold text-white">
          {DEMO_USER.initials}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <b className="block truncate text-[13px] text-[color:var(--side-ink)]">
              {DEMO_USER.fullName}
            </b>
            <small className="block truncate text-[11px] text-[color:var(--side-muted)]">
              {DEMO_USER.role}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
