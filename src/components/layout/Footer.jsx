import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { NavItem } from "@/components/layout/NavItem";
import { Button } from "@/components/ui/Button";
import { legalLinks } from "@/constants/navigation";
import { contact } from "@/constants/contact";
import { listCourses } from "@/lib/catalog";

const contactDetails = [
  {
    label: "Phone",
    value: contact.phone,
    href: contact.phoneHref,
    icon: (
      <path
        d="M4.5 3.5h2l1 3-1.7 1.3a8.5 8.5 0 004.4 4.4l1.3-1.7 3 1v2c0 .8-.7 1.5-1.5 1.4A12 12 0 013.1 5c-.1-.8.6-1.5 1.4-1.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Address",
    value: contact.address,
    href: null,
    icon: (
      <>
        <path
          d="M10 17.5s5.5-4.9 5.5-9a5.5 5.5 0 10-11 0c0 4.1 5.5 9 5.5 9z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
  {
    label: "Email",
    value: contact.email,
    href: contact.emailHref,
    icon: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 6l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: <path d="M12 6.5h-1.5c-.5 0-1 .4-1 1V9h2.5l-.4 2.5H9.5V17H7v-5.5H5.5V9H7V7.2C7 5.4 8.2 4 10 4h2v2.5z" fill="currentColor" />,
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <>
        <rect x="4" y="4" width="12" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13.3" cy="6.7" r="0.7" fill="currentColor" />
      </>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: (
      <>
        <rect x="3" y="5.5" width="14" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 8v4l3.5-2-3.5-2z" fill="currentColor" />
      </>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <>
        <rect x="4" y="8" width="2.4" height="7" fill="currentColor" />
        <circle cx="5.2" cy="5.2" r="1.3" fill="currentColor" />
        <path
          d="M9 8h2.3v1c.5-.7 1.3-1.2 2.4-1.2 1.9 0 3 1.2 3 3.5V15h-2.4v-3.3c0-1-.4-1.7-1.4-1.7-.8 0-1.3.5-1.5 1-.1.2-.1.5-.1.8V15H9V8z"
          fill="currentColor"
        />
      </>
    ),
  },
  {
    label: "X",
    href: "https://x.com",
    icon: <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  },
];

export function Footer() {
  const courses = listCourses({ publishedOnly: true });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-dark text-white">
      <Container className="py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
          {/* Brand + description + social — spans the full height of the right block */}
          <div>
            {/* The logo's wordmark is dark navy, so it sits on a white tile to
                stay legible on the dark footer. */}
            <Link
              href="/"
              aria-label="TechOTD Academy — Home"
              className="inline-flex rounded-md bg-white px-3 py-1.5"
            >
              <Image
                src="/techotd-logo-v3.png"
                alt="TechOTD Academy — Learn, Build, Grow"
                width={1723}
                height={555}
                className="h-16 w-auto"
              />
            </Link>

            <p className="mt-5 max-w-xs text-sm text-white/60">
              TechOTD Academy is a career-focused training institute offering
              practical, industry-ready programs guided by expert mentors.
            </p>

            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    {social.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            {/* Phone / Address / Email */}
            <div className="grid grid-cols-1 gap-6 border-b border-white/10 pb-8 sm:grid-cols-3">
              {contactDetails.map((item) => {
                const content = (
                  <>
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-white">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{item.label}</span>
                      <span className="mt-0.5 block text-sm text-white/60">{item.value}</span>
                    </span>
                  </>
                );
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    {item.href ? (
                      <a
                        href={item.href}
                        className="flex items-start gap-3 hover:text-white"
                        suppressHydrationWarning
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </div>
                );
              })}
            </div>

            {/* Courses + Policies */}
            <div className="grid grid-cols-1 gap-8 border-b border-white/10 py-8 sm:grid-cols-[2fr_1fr]">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Our Popular <span className="text-primary">Courses</span>
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {courses.map((course) => (
                    <Link
                      key={course.slug}
                      href={`/courses/${course.slug}`}
                      className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                    >
                      <span aria-hidden="true" className="text-primary">
                        ›
                      </span>
                      {course.title}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">Policies</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {legalLinks.map((link) => (
                    <li key={link.label}>
                      <NavItem
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                      >
                        <span aria-hidden="true" className="text-primary">
                          ›
                        </span>
                        {link.label}
                      </NavItem>
                    </li>
                  ))}
                  <li>
                    <NavItem
                      href="/faq"
                      className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                    >
                      <span aria-hidden="true" className="text-primary">
                        ›
                      </span>
                      FAQs
                    </NavItem>
                  </li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-8">
              <Button
                href="/book-demo?source=footer"
                className="bg-gradient-to-r from-primary to-secondary shadow-none hover:opacity-90"
              >
                Get Free Consultation
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 text-sm text-white/50 sm:flex-row">
          <p>© {year} TechOTD Academy — A TechOTD Pvt. Ltd. initiative. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <NavItem key={link.label} href={link.href} className="hover:text-white">
                {link.label}
              </NavItem>
            ))}
          </div>
        </Container>
      </div>
    </footer>
  );
}
