import { DEMO_USER } from '@/lib/demo-data';
import { Icon, VestaMark, type IconName } from '@/components/ui/Icon';

type NavItem = {
  label: string;
  icon: IconName;
  badge?: number;
  active?: boolean;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    heading: 'Workspace',
    items: [
      { label: 'Today', icon: 'home', badge: 16, active: true },
      { label: 'Waiting on Me', icon: 'clock', badge: 8 },
      { label: 'Follow-ups', icon: 'reply', badge: 3 },
      { label: 'Draft Replies', icon: 'list', badge: 4 },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'Delegation', icon: 'delegate' },
      { label: 'Memory & Rules', icon: 'brain' },
      { label: 'Weekly Review', icon: 'trend' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="v-scroll flex flex-col gap-[22px] overflow-y-auto rounded-lg border border-[color:var(--side-border)] bg-[image:var(--side-bg)] p-[22px_18px] text-[color:var(--side-ink)] shadow-panel">
      {/* Brand */}
      <div className="flex items-center gap-[13px]">
        <div className="grid h-11 w-11 flex-none place-items-center rounded-[13px] bg-[radial-gradient(circle_at_50%_95%,#67e8d8,#5ba8f5_45%,var(--accent-2)_100%)] shadow-[0_8px_22px_rgba(74,111,165,0.4),inset_0_0_0_1px_rgba(255,255,255,.25)]">
          <VestaMark className="relative z-10 h-[22px] w-[22px] text-white drop-shadow" />
        </div>
        <div>
          <b className="block font-display text-[18px] font-semibold leading-[1.05] tracking-tight text-[color:var(--side-ink)]">
            Vesta
          </b>
          <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--side-muted)]">
            Your work, in order
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-[3px]">
        {NAV.map((group) => (
          <div key={group.heading} className="flex flex-col gap-[3px]">
            <div className="mx-[6px] mb-1 mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--side-lbl)]">
              {group.heading}
            </div>
            {group.items.map((item) => (
              <a
                key={item.label}
                role="link"
                tabIndex={0}
                aria-current={item.active ? 'page' : undefined}
                className={[
                  'relative flex cursor-pointer items-center gap-[11px] rounded-xl px-3 py-[10px] text-sm font-medium transition',
                  item.active
                    ? 'bg-[image:var(--side-active-bg)] text-[color:var(--side-ink)]'
                    : 'text-[color:var(--side-link)] hover:bg-[color:var(--side-hover)] hover:text-[color:var(--side-ink)]',
                ].join(' ')}
              >
                <Icon
                  name={item.icon}
                  className={`h-[18px] w-[18px] flex-none ${item.active ? 'text-accent' : 'opacity-85'}`}
                />
                {item.label}
                {item.badge !== undefined && (
                  <span
                    className={[
                      'ml-auto rounded-full px-[9px] py-[2px] font-mono text-[11px] font-semibold',
                      item.active
                        ? 'bg-accent text-white'
                        : 'bg-[color:var(--side-badge-bg)] text-[color:var(--side-badge-ink)]',
                    ].join(' ')}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div className="mt-auto flex items-center gap-3 rounded-[15px] border border-[color:var(--side-card-border)] bg-[color:var(--side-card)] p-[13px]">
        <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 text-[15px] font-bold text-white">
          {DEMO_USER.initials}
        </div>
        <div>
          <b className="block text-[13px] text-[color:var(--side-ink)]">{DEMO_USER.fullName}</b>
          <small className="text-[11px] text-[color:var(--side-muted)]">{DEMO_USER.role}</small>
        </div>
      </div>
    </aside>
  );
}
