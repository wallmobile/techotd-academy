"use client";

import { useState } from "react";
import Link from "next/link";
import { Section } from "@/components/shared/Section";
import { faqs } from "@/data/faqs";
import { cn } from "@/lib/utils";

/**
 * An Apple-style FAQ: a big bold headline, lots of white space, and soft grey
 * cards that open with a round +/− control. Questions and answers come from
 * the faqs data.
 */
export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Section className="bg-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-dark sm:text-5xl lg:text-6xl">
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Everything you need to know before you start. Still unsure?{" "}
          <Link href="/enquiry" className="whitespace-nowrap font-medium text-primary hover:underline hover:underline-offset-4">
            Ask our team <span aria-hidden="true">›</span>
          </Link>
        </p>
      </div>

      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-3 sm:mt-14">
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-trigger-${index}`;

          return (
            <div
              key={faq.question}
              className={cn(
                "rounded-3xl bg-surface transition-all duration-300",
                open ? "shadow-[0_8px_30px_-12px] shadow-black/15 ring-1 ring-black/5" : "hover:bg-[#eef1f6]"
              )}
            >
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="flex w-full items-center justify-between gap-6 rounded-3xl px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-8 sm:py-6"
                >
                  <span className="text-lg font-semibold tracking-tight text-dark sm:text-xl">{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors duration-300",
                      open ? "bg-dark text-white" : "bg-white text-dark shadow-soft"
                    )}
                  >
                    <span className="absolute h-0.5 w-3 rounded-full bg-current" />
                    <span className={cn("absolute h-3 w-0.5 rounded-full bg-current transition-transform duration-300", open && "scale-y-0")} />
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={cn("grid transition-all duration-400 ease-out", open ? "grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0")}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-7 text-lg leading-relaxed text-muted sm:px-8">{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
