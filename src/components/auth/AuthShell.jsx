import Image from "next/image";
import Link from "next/link";
import { getCourse, listBatches } from "@/lib/catalog";

const DEFAULT_HIGHLIGHTS = [
  "One account across courses, batches and enquiries",
  "Your details stay private and are never shared without consent",
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2.5l6 2.2v4.6c0 3.6-2.5 6.4-6 8.2-3.5-1.8-6-4.6-6-8.2V4.7l6-2.2z" />
      <path d="M7.2 10l2 2 3.6-4" />
    </svg>
  );
}

function Logo({ className }) {
  return (
    <Link href="/" aria-label="TechOTD Academy — Home" className="inline-flex">
      <Image
        src="/techotd-logo-v3.png"
        alt="TechOTD Academy — Learn, Build, Grow"
        width={1723}
        height={555}
        priority
        className={className}
      />
    </Link>
  );
}

// Compact, consistent styling for every auth form rendered as `children`.
const FORM_STYLES = [
  "[&_label]:text-[13px] [&_label]:font-medium [&_label]:text-dark",
  "[&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:rounded-xl [&_input:not([type=checkbox])]:border-border [&_input:not([type=checkbox])]:bg-surface/70 [&_input:not([type=checkbox])]:text-[13px] [&_input:not([type=checkbox])]:transition-all [&_input:not([type=checkbox])]:hover:border-primary/40 [&_input:not([type=checkbox])]:focus:border-primary [&_input:not([type=checkbox])]:focus:bg-white [&_input:not([type=checkbox])]:focus:ring-4 [&_input:not([type=checkbox])]:focus:ring-primary/10",
  "[&_input[type=checkbox]]:accent-primary",
  "[&_button[type=submit]]:h-11 [&_button[type=submit]]:w-full [&_button[type=submit]]:rounded-xl [&_button[type=submit]]:bg-linear-to-r [&_button[type=submit]]:from-primary [&_button[type=submit]]:via-primary [&_button[type=submit]]:to-secondary [&_button[type=submit]]:text-sm [&_button[type=submit]]:font-semibold [&_button[type=submit]]:shadow-lg [&_button[type=submit]]:shadow-primary/30 [&_button[type=submit]]:transition-all [&_button[type=submit]]:hover:-translate-y-0.5 [&_button[type=submit]]:hover:shadow-xl [&_button[type=submit]]:hover:shadow-primary/40",
].join(" ");

/**
 * Shared layout for every authentication page: one compact, centered card
 * (brand side + form side) floating on a soft pastel background. It skips
 * the public Header/Footer but reuses the brand mark, colors and motion.
 *
 * `aside` optionally renders a "switch page" prompt next to the back link,
 * e.g. { text: "New here?", label: "Create account", href: "/register" }.
 */
export function AuthShell({ eyebrow, title, description, highlights, aside, children }) {
  const points = highlights && highlights.length > 0 ? highlights : DEFAULT_HIGHLIGHTS;
  const nextBatch = listBatches({ publicOnly: true })[0];
  const nextCourse = nextBatch ? getCourse(nextBatch.courseSlug) : null;

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-surface px-4 py-8">
      {/* ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-[100px]" />
        <div className="animate-drift-slow absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-secondary/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(rgb(37 99 235 / 0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
          }}
        />
      </div>

      <div className="animate-fade-up-in relative w-full max-w-225">
        <div className="mb-3 flex items-center justify-between px-1 text-xs">
          <Link href="/" className="inline-flex items-center gap-1.5 font-medium text-muted transition-all hover:gap-2.5 hover:text-primary">
            <span aria-hidden="true">←</span> Back to home
          </Link>
          {aside && (
            <p className="text-muted">
              {aside.text}{" "}
              <Link href={aside.href} className="font-semibold text-primary hover:underline">
                {aside.label}
              </Link>
            </p>
          )}
        </div>

        {/* gradient halo behind the card */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-0 top-10 -z-10 rounded-[2rem] bg-linear-to-r from-primary/30 via-secondary/30 to-primary/30 blur-2xl"
        />

        <div className="grid overflow-hidden rounded-3xl bg-white shadow-elevated ring-1 ring-border md:grid-cols-[0.9fr_1.1fr]">
          {/* Brand side */}
          <aside className="relative isolate hidden flex-col overflow-hidden bg-linear-to-br from-primary via-[#4a46e8] to-secondary p-7 text-white md:flex">
            <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-white/10" />
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-1/3 h-40 w-40 rounded-full border border-white/15" />
            <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-[38%] h-24 w-24 rounded-full border border-white/10" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 opacity-25"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                maskImage: "linear-gradient(to bottom, black, transparent 70%)",
                WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
              }}
            />
            <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/15 to-transparent" />

            <span className="relative inline-flex self-start rounded-lg bg-white px-3 py-1.5 shadow-lg">
              <Logo className="h-7 w-auto" />
            </span>

            {/* decorative "live class" composition */}
            <div aria-hidden="true" className="relative my-auto flex min-h-36 items-center py-6">
              <span className="absolute inset-x-5 top-6 bottom-4 rotate-3 rounded-2xl border border-white/15 bg-white/10" />
              <div className="animate-float relative w-full -rotate-2 rounded-2xl border border-white/30 bg-white/15 p-3.5 shadow-[0_18px_40px_-12px_rgb(15_23_42/0.45)] backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-danger" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
                    </span>
                    Live class
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <span className="block h-2 w-3/4 rounded-full bg-linear-to-r from-white/70 to-white/20" />
                  <span className="block h-2 w-full rounded-full bg-white/25" />
                  <span className="block h-2 w-2/3 rounded-full bg-white/25" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {["FSD", "RJS", "AI"].map((label) => (
                      <span
                        key={label}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[7px] font-black text-primary ring-2 ring-primary/60"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-white/80">Mentor-led sessions</span>
                </div>
              </div>

              {/* floating tech chips */}
              <span className="animate-float absolute -right-2 -top-1 rounded-full border border-white/30 bg-white px-2.5 py-1 text-[10px] font-bold text-primary shadow-lg" style={{ animationDelay: "-1s" }}>
                React
              </span>
              <span className="animate-float absolute -right-3 top-[52%] rounded-full border border-white/30 bg-dark px-2.5 py-1 text-[10px] font-bold text-white shadow-lg" style={{ animationDelay: "-3s" }}>
                Node.js
              </span>
              <span className="animate-float absolute -bottom-1 right-6 rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-secondary shadow-lg" style={{ animationDelay: "-5s" }}>
                Python
              </span>
            </div>

            <div className="relative">
              <p className="text-[32px] font-bold leading-[1.08] tracking-tight">
                Learn. Build.
                <br />
                <span className="animate-gradient-x bg-linear-to-r from-white via-sky-200 to-white bg-clip-text text-transparent">
                  Grow.
                </span>
              </p>

              <ul className="mt-4 flex flex-col gap-2.5">
                {points.slice(0, 1).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/90">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {nextCourse && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 text-dark shadow-elevated ring-1 ring-white/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-[11px] font-black text-white shadow-md shadow-primary/30">
                    {nextCourse.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Next batch starts</p>
                    <p className="truncate text-[13px] font-semibold">{nextCourse.title}</p>
                    <p className="text-[11px] text-muted">
                      {nextBatch.startDate} · {nextBatch.schedule.split("•")[1]?.trim()}
                    </p>
                  </div>
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    →
                  </span>
                </div>
              )}
            </div>
          </aside>

          {/* Form side */}
          <main className="relative p-6 sm:p-8">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-secondary to-primary md:hidden" />
            <div className="mb-5 md:hidden">
              <Logo className="h-8 w-auto" />
            </div>
            {eyebrow && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                {eyebrow}
              </p>
            )}
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-dark">{title}</h1>
            {description && <p className="mt-1.5 text-[13px] leading-snug text-muted">{description}</p>}

            <div className={`mt-5 ${FORM_STYLES}`}>{children}</div>

            <p className="mt-5 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted">
              <span className="text-success">
                <ShieldIcon />
              </span>
              Secure & private · Your details are never shared without consent
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
