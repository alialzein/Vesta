const STEPS = [
  { title: 'Collects work', detail: 'Outlook, Teams, tasks, and calendar items.' },
  { title: 'Scores priority', detail: 'Urgency, follow-ups, deadlines, VIPs, blockers.' },
  { title: 'You review', detail: 'One dashboard instead of many inboxes.' },
  { title: 'You act fast', detail: 'Reply, delegate, remind, snooze, approve.' },
  { title: 'It learns', detail: 'Tone, people, and rules improve weekly.' },
];

export function HowItWorks() {
  return (
    <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow backdrop-blur-[16px]">
      <div className="mb-[14px]">
        <h2 className="m-0 font-display text-[19px] font-medium tracking-tight">
          How the assistant works
        </h2>
      </div>
      <div className="mt-1 grid grid-cols-1 gap-[11px] sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-[14px] border border-line bg-panel-2 p-[14px]"
          >
            <div className="mb-[9px] grid h-[26px] w-[26px] place-items-center rounded-lg bg-accent-soft font-mono text-[13px] font-bold text-accent">
              {i + 1}
            </div>
            <strong className="block text-[13px] font-semibold leading-tight">{step.title}</strong>
            <span className="mt-[5px] block text-[11.5px] leading-snug text-muted">
              {step.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
