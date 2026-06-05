const CIRCUMFERENCE = 377; // 2 * pi * r, r = 60

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
