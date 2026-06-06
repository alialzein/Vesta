const CIRCUMFERENCE = 377; // 2 * pi * r, r = 60

/** Full-size ring (kept for reuse; not used in the default layout). */
export function UrgencyRing({ score }: { score: number }) {
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * score) / 100;

  return (
    <div className="flex flex-col items-center justify-center gap-[10px] text-center">
      <div className="relative h-[140px] w-[140px]">
        <svg width="140" height="140" viewBox="0 0 140 140" className="ring-arc">
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--ring-track)" strokeWidth="11" />
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent)" />
              <stop offset="1" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <b className="grad-text font-display text-[44px] font-semibold leading-none tracking-tight drop-shadow">
            {score}
          </b>
        </div>
      </div>
      <div className="max-w-[170px] text-[12.5px] text-muted">
        Highest urgency score in your queue right now
      </div>
    </div>
  );
}

const C_SMALL = 226; // 2 * pi * r, r = 36

/** Compact ring used inside the Morning Brief header. */
export function CompactUrgencyRing({ score }: { score: number }) {
  const offset = C_SMALL - (C_SMALL * score) / 100;

  return (
    <div className="flex flex-none items-center gap-3 self-start rounded-[14px] border border-line bg-panel-2 p-3">
      <div className="relative h-[80px] w-[80px]">
        <svg width="80" height="80" viewBox="0 0 80 80" className="ring-arc">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--ring-track)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="url(#ringGradientSm)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C_SMALL}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="ringGradientSm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--accent)" />
              <stop offset="1" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <b className="grad-text font-display text-[24px] font-semibold leading-none tracking-tight">
            {score}
          </b>
        </div>
      </div>
      <div className="max-w-[110px] text-[11px] font-medium leading-snug text-muted">
        Highest urgency in your queue
      </div>
    </div>
  );
}
