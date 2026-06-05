import type { Config } from 'tailwindcss';

/**
 * Theming is driven by CSS variables defined in app/globals.css
 * (Arctic Frost dark + light palettes). Tailwind tokens here just map to
 * those variables so components can use utility classes like `bg-panel`,
 * `text-ink`, `border-line` while the active palette stays variable-driven.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-solid': 'var(--panel-solid)',
        'panel-2': 'var(--panel-2)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        'accent-soft': 'var(--accent-soft)',
        red: 'var(--red)',
        'red-soft': 'var(--red-soft)',
        amber: 'var(--amber)',
        'amber-soft': 'var(--amber-soft)',
        green: 'var(--green)',
        'green-soft': 'var(--green-soft)',
        field: 'var(--field-bg)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        glow: 'var(--glow)',
        panel: 'var(--shadow)',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(.2,.7,.2,1)',
      },
    },
  },
  plugins: [],
};

export default config;
