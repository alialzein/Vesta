import type { CommandCard, CommandIcon } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

/** Map a command-card icon key onto the shared icon set. */
const ICON: Record<CommandIcon, IconName> = {
  sparkle: 'sparkle',
  calendar: 'calendar',
  delegate: 'delegate',
  inbox: 'inbox',
};

/**
 * Each accent maps to a soft gradient defined by CSS vars in globals.css,
 * so the cards adapt to light/dark automatically.
 */
const GRADIENT: Record<CommandCard['accent'], string> = {
  1: 'bg-[linear-gradient(135deg,var(--cmd-1a),var(--cmd-1b))]',
  2: 'bg-[linear-gradient(135deg,var(--cmd-2a),var(--cmd-2b))]',
  3: 'bg-[linear-gradient(135deg,var(--cmd-3a),var(--cmd-3b))]',
  4: 'bg-[linear-gradient(135deg,var(--cmd-4a),var(--cmd-4b))]',
};

type AiCommandCenterProps = {
  cards: CommandCard[];
  /** Demo-only: invoked with the card id when its CTA is activated. */
  onCardAction: (cardId: string) => void;
};

/**
 * AI Command Center — quick AI-assisted flows (Clear My Day, Meeting Prep,
 * Delegate Work, Clean Inbox). Demo only: CTAs trigger local React behavior
 * (drawers, radar filter, toast). See docs/demo/demo-behavior.md.
 *
 * The last card (Clean Inbox) is treated as secondary and is hidden on very
 * small screens to reduce vertical pressure above Today's Radar.
 */
export function AiCommandCenter({ cards, onCardAction }: AiCommandCenterProps) {
  return (
    <section aria-labelledby="ai-command-center-heading">
      <div className="mb-3 flex items-center gap-[9px]">
        <Icon name="sparkle" className="h-[17px] w-[17px] text-accent" />
        <h2
          id="ai-command-center-heading"
          className="m-0 font-display text-[18px] font-medium tracking-tight"
        >
          AI Command Center
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => {
          // Treat the 4th card as secondary: hidden below sm.
          const secondary = i >= 3;
          return (
            <article
              key={card.id}
              className={[
                'group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel p-[15px] shadow-soft transition duration-300 hover:-translate-y-[3px] hover:shadow-glow',
                secondary ? 'hidden sm:flex' : '',
              ].join(' ')}
            >
              {/* Soft gradient wash + abstract shape */}
              <span
                className={`pointer-events-none absolute inset-0 opacity-90 ${GRADIENT[card.accent]}`}
                aria-hidden="true"
              />
              <span
                className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-[2px] transition-transform duration-500 group-hover:scale-110 ${GRADIENT[card.accent]}`}
                aria-hidden="true"
              />

              <div className="relative flex flex-1 flex-col">
                <span className="mb-[11px] grid h-10 w-10 place-items-center rounded-[12px] border border-line-strong bg-panel-solid text-accent shadow-soft">
                  <Icon name={ICON[card.icon]} className="h-[19px] w-[19px]" />
                </span>
                <h3 className="m-0 font-display text-[15px] font-semibold tracking-tight text-ink">
                  {card.title}
                </h3>
                <p className="mt-[5px] flex-1 text-[12px] leading-snug text-ink-soft">
                  {card.description}
                </p>
                <button
                  type="button"
                  onClick={() => onCardAction(card.id)}
                  aria-label={`${card.cta} — ${card.title}`}
                  className="mt-[12px] inline-flex w-fit items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
                >
                  {card.cta}
                  <Icon name="arrow" className="h-[14px] w-[14px]" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
