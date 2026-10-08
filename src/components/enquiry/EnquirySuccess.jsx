import { Button } from "@/components/ui/Button";

const CONFETTI = [
  { tx: "-86px", ty: "-70px", rot: "-200deg", color: "bg-primary" },
  { tx: "-60px", ty: "-98px", rot: "140deg", color: "bg-secondary" },
  { tx: "-20px", ty: "-110px", rot: "-90deg", color: "bg-success" },
  { tx: "30px", ty: "-104px", rot: "220deg", color: "bg-warning" },
  { tx: "72px", ty: "-86px", rot: "-160deg", color: "bg-primary" },
  { tx: "98px", ty: "-44px", rot: "120deg", color: "bg-secondary" },
  { tx: "-100px", ty: "-30px", rot: "180deg", color: "bg-warning" },
  { tx: "96px", ty: "6px", rot: "-120deg", color: "bg-success" },
  { tx: "-92px", ty: "20px", rot: "90deg", color: "bg-primary" },
  { tx: "60px", ty: "50px", rot: "-210deg", color: "bg-secondary" },
  { tx: "-54px", ty: "56px", rot: "160deg", color: "bg-success" },
  { tx: "8px", ty: "70px", rot: "-100deg", color: "bg-warning" },
];

export function EnquirySuccess({ name, onReset }) {
  return (
    <div className="animate-fade-up-in flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-8 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`animate-confetti absolute left-1/2 top-1/2 h-2 w-1.5 rounded-[2px] ${piece.color}`}
            style={{ "--tx": piece.tx, "--ty": piece.ty, "--rot": piece.rot, animationDelay: `${150 + (index % 4) * 40}ms` }}
          />
        ))}
        <span aria-hidden="true" className="animate-ping-soft absolute inset-0 rounded-full bg-success/30" />
        <span className="animate-pop-in relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-success to-emerald-400 text-white shadow-lg shadow-success/30">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success">Request received</p>
      <h2 className="text-2xl font-bold tracking-tight text-dark">
        Thank you{name ? `, ${name}` : ""}.
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Your request has been submitted successfully. We&apos;ll be in
        touch to follow up.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <Button href="/courses" variant="outline" size="sm">
          Browse Courses
        </Button>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-primary hover:text-primary-hover"
        >
          Submit another request
        </button>
      </div>
    </div>
  );
}
