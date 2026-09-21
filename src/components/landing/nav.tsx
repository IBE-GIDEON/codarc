"use client";

import * as React from "react";
import { Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/landing/shared";
import { cn } from "@/lib/cn";

const links = [
  ["How it works", "#how"],
  ["What it does", "#what"],
  ["Pricing", "/pricing"],
];

export function Nav() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background,box-shadow] duration-200",
        scrolled &&
          "bg-page/80 shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl",
      )}
    >
      <Container>
        <div className="flex h-16 items-center gap-6">
          <a href="#" className="shrink-0" aria-label="Codarc home">
            <Wordmark size="md" />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="notion-hover px-2.5 py-1.5 text-[14px] text-secondary hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex" />
            {/* The dashboard sends anyone signed out to GitHub first, then
                brings them straight back — so this is both "log in" and
                "go to my projects". */}
            <a
              href="/dashboard"
              className="notion-hover hidden px-2.5 py-1.5 text-[14px] text-secondary hover:text-primary sm:block"
            >
              Log in
            </a>
            <a href="#start" className="shrink-0">
              <Button variant="primary" size="lg">
                Try Codarc
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </header>
  );
}
