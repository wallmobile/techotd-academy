import Image from "next/image";

const skillIcons = {
  web: (
    <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
      <path d="M9 8l-5 5 5 5M17 8l5 5-5 5M14.5 6l-3 14" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  react: (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="#22d3ee" strokeWidth="1.7">
      <circle cx="14" cy="14" r="2" fill="#22d3ee" stroke="none" />
      <ellipse cx="14" cy="14" rx="11" ry="4.5" />
      <ellipse cx="14" cy="14" rx="11" ry="4.5" transform="rotate(60 14 14)" />
      <ellipse cx="14" cy="14" rx="11" ry="4.5" transform="rotate(120 14 14)" />
    </svg>
  ),
  node: (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <path d="M14 2l10 5.8v12.4L14 26 4 20.2V7.8L14 2z" fill="#4ade80" />
      <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0b1f3a">
        JS
      </text>
    </svg>
  ),
  python: (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="15" height="15" rx="5" fill="#3b82f6" />
      <rect x="10" y="10" width="15" height="15" rx="5" fill="#facc15" />
    </svg>
  ),
  design: (
    <svg width="18" height="24" viewBox="0 0 22 28" fill="none">
      <circle cx="6.5" cy="6" r="5" fill="#f87171" />
      <circle cx="15.5" cy="6" r="5" fill="#fb923c" />
      <circle cx="6.5" cy="15" r="5" fill="#a78bfa" />
      <circle cx="15.5" cy="15" r="5" fill="#38bdf8" />
      <circle cx="6.5" cy="23" r="4.5" fill="#4ade80" />
    </svg>
  ),
};

/** Glass skill card. Upright (no tilt) so the set reads as a tidy cluster. */
function SkillCard({ label, icon, fill, className, compact = false }) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className={`animate-float flex items-center gap-2.5 rounded-xl border border-white/15 bg-[#0d1f4d]/90 px-3 py-2.5 text-white shadow-elevated backdrop-blur-md ${
          "w-44"
        }`}
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/10">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{label}</span>
          <span className="mt-1.5 block h-1 rounded-full bg-white/20">
            <span className={`block h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 ${fill}`} />
          </span>
        </span>
      </div>
    </div>
  );
}

const dots = {
  backgroundImage: "radial-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1.5px)",
  backgroundSize: "22px 22px",
};

/**
 * Hero illustration built around the student cut-out
 * (/public/hero-student-cutout.png). Everything else is CSS: a rounded
 * gradient card the student rises out of, rings, dot grid and five floating
 * skill cards. Purely decorative, so it is aria-hidden.
 */
export function HeroScene() {
  return (
    <div className="relative h-[30rem] w-full sm:h-[36rem] lg:h-[37rem]" aria-hidden="true">
      {/* Rounded gradient card — starts lower so the student can rise above it */}
      <div className="absolute -left-[2%] -right-[2%] bottom-0 top-[18%] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1f3a] via-[#173a9b] to-[#6d28d9] shadow-elevated">
        <div className="absolute inset-0" style={dots} />
        <div className="absolute -right-24 -top-24 h-[24rem] w-[24rem] rounded-full border border-white/15" />
        <div className="absolute -right-8 -top-8 h-[17rem] w-[17rem] rounded-full border border-white/15" />
        <div className="absolute -right-16 top-10 h-64 w-64 rounded-full bg-secondary/50 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary/50 blur-3xl" />
      </div>

      {/* Student: spans the whole scene box, sitting on the card's bottom edge
          and rising above its top. Clip keeps the bottom corners rounded. */}
      <div className="absolute inset-0" style={{ clipPath: "inset(-10% -10% 0 -30% round 0 0 2rem 2rem)" }}>
        <Image
          src="/hero-student-cutout.png"
          alt=""
          width={1407}
          height={1118}
          priority
          sizes="(min-width: 1024px) 44vw, 92vw"
          className="absolute bottom-0 right-[-2%] h-auto w-[112%] max-w-none"
        />
      </div>

      {/* Floating skill cards — Web/React/Node on the left, Python/UI-UX on the right (over the shoulder, clear of the face) */}
      <SkillCard compact label="Web Development" icon={skillIcons.web} fill="w-3/4" className="left-[-9%] top-[27%] [animation-delay:-1s]" />
      <SkillCard compact label="React.js" icon={skillIcons.react} fill="w-2/3" className="left-[0%] top-[41%] [animation-delay:-3s]" />
      <SkillCard compact label="Node.js" icon={skillIcons.node} fill="w-3/5" className="left-[-9%] top-[55%] [animation-delay:-5s]" />
      <SkillCard compact label="Python" icon={skillIcons.python} fill="w-1/2" className="right-[2%] top-[26%] min-[1280px]:right-[-16%] hidden [animation-delay:-2s] sm:block lg:block" />
      <SkillCard compact label="UI/UX Design" icon={skillIcons.design} fill="w-2/3" className="right-[4%] top-[39%] min-[1280px]:right-[-12%] hidden [animation-delay:-4s] sm:block lg:block" />
    </div>
  );
}
