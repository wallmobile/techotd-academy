"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { isBuiltRoute } from "@/constants/navigation";
import { Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

export function TrainingFAQ({ trainingMode }) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!trainingMode.faqs || trainingMode.faqs.length === 0) return null;

  const bookDemoHref = `/book-demo?mode=${trainingMode.slug}&source=training`;

  return (
    <section className="bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Questions about <Gradient>{trainingMode.shortTitle}</Gradient> Training
            </h2>
            <div className="mt-8 rounded-3xl border border-border bg-surface p-6">
              <p className="text-base font-semibold text-dark">Still have a question?</p>
              <p className="mt-1.5 text-sm text-muted">Our counsellors can walk you through the format and the right course for you.</p>
              {isBuiltRoute(bookDemoHref) && (
                <Button href={bookDemoHref} size="sm" className="mt-4">
                  Talk to a Counsellor
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {trainingMode.faqs.map((faq, index) => {
              const open = openIndex === index;
              const panelId = `training-faq-panel-${index}`;
              const buttonId = `training-faq-trigger-${index}`;

              return (
                <div
                  key={faq.question}
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
                      {faq.question}
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
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
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
