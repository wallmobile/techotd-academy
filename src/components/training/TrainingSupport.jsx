import { Section } from "@/components/shared/Section";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

// Cycled by position so each card gets its own glyph.
const supportIcons = [
  <path key="chat" d="M4 5h12v8H9l-3 3v-3H4z" />,
  <path key="video" d="M3 5.5h10v9H3zM13 8.5l4-2v7l-4-2" />,
  <path key="book" d="M10 5c-1.5-1-4-1.3-6-1v11c2-.3 4.5 0 6 1 1.5-1 4-1.3 6-1V4c-2-.3-4.5 0-6 1zM10 5v11" />,
  <path key="code" d="M7 6l-4 4 4 4M13 6l4 4-4 4" />,
  <g key="compass">
    <circle cx="10" cy="10" r="7" />
    <path d="M12.8 7.2l-1.6 4-4 1.6 1.6-4z" />
  </g>,
];

export function TrainingSupport({ trainingMode }) {
  const items = trainingMode.support;
  // 5 items sit as 3 + 2 on a 6-col grid so the last row isn't left ragged
  const span = (index) => (items.length === 5 && index >= 3 ? "lg:col-span-3" : "lg:col-span-2");

  return (
    <Section>
      <SectionHeading
        eyebrow="Support"
        title={
          <>
            Support <Gradient>alongside</Gradient> this mode
          </>
        }
        description="Practical support areas available as part of the learning experience."
        align="left"
      />
      <Reveal variants={staggerContainer} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {items.map((item, index) => (
          <RevealItem
            key={item}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated ${span(index)}`}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-linear-to-b from-primary to-secondary transition-transform duration-300 group-hover:scale-y-100"
            />
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {supportIcons[index % supportIcons.length]}
              </svg>
            </span>
            <h3 className="text-base font-semibold leading-snug text-dark">{item}</h3>
          </RevealItem>
        ))}
      </Reveal>
    </Section>
  );
}
