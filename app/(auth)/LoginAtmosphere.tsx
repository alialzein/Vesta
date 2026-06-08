/**
 * Subtle AI atmosphere behind the login screen.
 *
 * Low-opacity blue/cyan radial blooms (shared `--atmos-*` tokens) plus a very
 * faint, vignette-masked signal grid in the far background. It only shows in the
 * space around the centered, opaque login card — never behind readable content —
 * consistent with the motion/readability rules in docs/archive/design/ai-motion-principles.md.
 *
 * Fully decorative: fixed, pointer-events-none, aria-hidden, z-0. The login card
 * renders above it. No animation here (calm), so nothing to disable for
 * reduced-motion; the only motion on this screen is the AI core + button.
 */
export function LoginAtmosphere() {
  return (
    <div
      aria-hidden="true"
      data-testid="login-atmosphere"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Top bloom behind the brand/core. */}
      <span className="absolute -top-[14%] left-1/2 h-[60vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--atmos-1),transparent_62%)] blur-[14px]" />
      {/* Lower-left ambient. */}
      <span className="absolute -left-[12%] bottom-[2%] h-[46vh] w-[40vw] rounded-full bg-[radial-gradient(circle,var(--atmos-2),transparent_60%)] blur-[14px]" />
      {/* Lower-right cyan/mint glow. */}
      <span className="absolute -right-[12%] bottom-[8%] h-[44vh] w-[38vw] rounded-full bg-[radial-gradient(circle,var(--atmos-mint),transparent_60%)] blur-[14px]" />
      {/* Far-background faint signal grid, masked to a soft center vignette. */}
      <span className="vesta-login-grid absolute inset-0" />
    </div>
  );
}
