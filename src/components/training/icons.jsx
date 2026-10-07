export function CheckIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/** Soft ambient glow used behind page-level sections. */
export function GlowBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="animate-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
      <div className="animate-drift-slow absolute -right-20 top-32 h-96 w-96 rounded-full bg-secondary/15 blur-[100px]" />
      <div className="animate-drift absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
    </div>
  );
}

/** Brand-gradient text accent for headings. */
export function Gradient({ children }) {
  return (
    <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">{children}</span>
  );
}

/** Faint dotted texture, faded out toward the edges. */
export function DotGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
      style={{
        backgroundImage: "radial-gradient(rgb(37 99 235 / 0.35) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        maskImage: "radial-gradient(ellipse 70% 80% at 50% 30%, black, transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 30%, black, transparent)",
      }}
    />
  );
}
