"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { NavItem } from "@/components/layout/NavItem";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { primaryNav, headerCta, authNav, isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-[background-color,box-shadow,border-color] duration-200",
        scrolled
          ? "border-b border-border bg-white/95 shadow-soft backdrop-blur"
          : "border-b border-transparent bg-white/0"
      )}
    >
      <Container className="flex h-20 items-center justify-between py-1">
        <Link href="/" aria-label="TechOTD Academy — Home" className="flex items-center">
          <Image
            src="/techotd-logo-v3.png"
            alt="TechOTD Academy — Learn, Build, Grow"
            width={1723}
            height={555}
            priority
            className="h-12 w-auto md:h-14 xl:h-[4.25rem]"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-4 md:flex xl:gap-7">
          {primaryNav.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text transition-colors hover:text-primary"
            >
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="hidden items-center gap-3 whitespace-nowrap md:flex xl:gap-4">
          <NavItem
            href={authNav.login.href}
            className="text-sm font-medium text-text transition-colors hover:text-primary"
          >
            {authNav.login.label}
          </NavItem>
          {isBuiltRoute(headerCta.href) ? (
            <Button href={headerCta.href} size="sm">
              {headerCta.label}
            </Button>
          ) : (
            <Button size="sm" disabled title="Coming soon">
              {headerCta.label}
            </Button>
          )}
        </div>

        <IconButton
          label="Open menu"
          className="md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 5.5H17M3 10H17M3 14.5H17"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
      </Container>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
