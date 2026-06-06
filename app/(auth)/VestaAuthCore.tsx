import { VestaMark } from '@/components/ui/Icon';

/**
 * Small AI "signal core" for the login screen — a calmer, smaller sibling of the
 * Vesta initialization splash (components/dashboard/VestaSplashScreen.tsx).
 *
 * Reuses the shared `vesta-*` motion classes (breathing core, slow orbit rings,
 * a traveling signal node, a pulsing live point), which are all disabled under
 * `prefers-reduced-motion` by the global block in app/globals.css. Purely
 * decorative: the whole system is aria-hidden and pointer-events-none.
 */
export function VestaAuthCore() {
  return (
    <div
      data-testid="vesta-auth-core"
      aria-hidden="true"
      className="pointer-events-none relative grid h-[118px] w-[118px] place-items-center"
    >
      {/* Soft radial field for depth. */}
      <span className="absolute -inset-[30%] rounded-full bg-[radial-gradient(circle,rgba(67,199,255,0.16),transparent_62%)] blur-[14px]" />
      {/* Outer halo bloom. */}
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(91,168,245,0.30),transparent_66%)] blur-[5px]" />

      {/* Outer ring (very slow) + one traveling node. */}
      <span className="animate-vesta-orbit-slow absolute inset-0 rounded-full border border-[rgba(140,196,255,0.18)]">
        <span className="absolute left-1/2 top-0 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#67e8d8] shadow-[0_0_10px_2px_rgba(103,232,216,0.7)]" />
      </span>

      {/* Inner ring (counter-rotating) + node. */}
      <span className="animate-vesta-orbit-rev absolute inset-[23px] rounded-full border border-[rgba(140,196,255,0.24)]">
        <span className="absolute bottom-0 left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#5ba8f5] shadow-[0_0_10px_2px_rgba(91,168,245,0.75)]" />
      </span>

      {/* Breathing luminous core with the Vesta mark. */}
      <span className="animate-vesta-breathe relative grid h-[68px] w-[68px] place-items-center rounded-full bg-[radial-gradient(circle_at_32%_26%,#7cc0ff,#2f7deb_70%)] text-white shadow-[0_0_38px_9px_rgba(91,168,245,0.5)]">
        <VestaMark className="h-[32px] w-[32px]" />
      </span>
    </div>
  );
}
