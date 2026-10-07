"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

/** Two-column FAQ: sticky intro on the left, smooth accordion on the right. */
export function FaqAccordion({ eyebrow = "FAQ", title, items, aside, id }) {
  const [openIndex, setOpenIndex] = useState(0);
  const key = id ?? "faq";

  return (
    <section id={id} className="scroll-mt-28 py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">{title}</h2>
            {aside && <div className="mt-8">{aside}</div>}
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => {
              const open = openIndex === index;
              const panelId = `${key}-panel-${index}`;
              const buttonId = `${key}-trigger-${index}`;
              return (
                <div
                  key={item.question}
                  className={cn(
                    "rounded-2xl border bg-white transition-all duration-300",
                    open ? "border-primary/30 shadow-card" : "border-border hover:border-primary/20"
                  )}
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-medium text-dark transition-colors hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      {item.question}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-all duration-300",
                          open ? "rotate-45 bg-linear-to-br from-primary to-secondary text-white" : "bg-surface text-muted"
                        )}
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!open}
                    className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
