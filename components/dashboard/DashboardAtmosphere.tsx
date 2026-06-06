/**
 * Subtle Vesta atmosphere behind the dashboard (Phase 0.5, Section D).
 *
 * A fixed, non-interactive layer of low-opacity radial blooms in the Vesta
 * blue/cyan family — soft light "coming from below and behind" the content.
 * Colors/opacity come from the theme tokens (`--atmos-*`), so it is stronger in
 * dark mode and very subtle in light mode.
 *
 * Deliberately NO grid: with the opaque card surfaces, the atmosphere shows only
 * in the shell gaps / margins / behind the (transparent) header — never as
 * "graph paper" behind readable content. The only grid lives on the splash. It
 * sits at the bottom of the shell's stacking context (z-0); dashboard content
 * and the sidebar render above it via `relative z-[1]`. Decorative only.
 */
export function DashboardAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-testid="dashboard-atmosphere"
    >
      {/* Lower-center blue bloom — depth below the work area. */}
      <span className="absolute -bottom-[20%] left-1/2 h-[70vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--atmos-1),transparent_62%)] blur-[12px]" />
      {/* Cyan/mint glow near the right AI rail. */}
      <span className="absolute -right-[12%] top-[2%] h-[55vh] w-[42vw] rounded-full bg-[radial-gradient(circle,var(--atmos-mint),transparent_60%)] blur-[12px]" />
      {/* Faint bottom-left ambient. */}
      <span className="absolute -left-[10%] bottom-[4%] h-[48vh] w-[40vw] rounded-full bg-[radial-gradient(circle,var(--atmos-2),transparent_60%)] blur-[12px]" />
    </div>
  );
}
