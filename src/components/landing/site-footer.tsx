import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { GithubMark, XMark } from "@/components/brand-marks";
import { Container } from "@/components/landing/shared";

/** Every link here goes somewhere real. A dead footer link reads as abandoned. */
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "What it does", href: "/#what" },
      { label: "Pricing", href: "/pricing" },
      { label: "Try it", href: "/#start" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Supported stacks", href: "/#stacks" },
      { label: "Design language", href: "/design" },
      { label: "Source code", href: "https://github.com/IBE-GIDEON/codarc" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "https://x.com/C0darc" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = href.startsWith("http");
  const className =
    "text-[13.5px] text-secondary transition-colors duration-150 hover:text-primary";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-sunken py-14">
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[300px]">
            <Link href="/" aria-label="Codarc home">
              <Wordmark size="md" />
            </Link>
            <p className="mt-3 text-[13.5px] leading-[1.55] text-tertiary">
              You shouldn&apos;t have to read forty files to change one thing.
            </p>
            <div className="mt-4 flex items-center gap-1">
              <a
                href="https://x.com/C0darc"
                target="_blank"
                rel="noreferrer"
                aria-label="Codarc on X"
                className="grid size-8 place-items-center rounded-sm text-tertiary transition-colors duration-150 hover:bg-hover hover:text-primary"
              >
                <XMark className="size-[15px]" />
              </a>
              <a
                href="https://github.com/IBE-GIDEON/codarc"
                target="_blank"
                rel="noreferrer"
                aria-label="Codarc on GitHub"
                className="grid size-8 place-items-center rounded-sm text-tertiary transition-colors duration-150 hover:bg-hover hover:text-primary"
              >
                <GithubMark className="size-[15px]" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <div className="mb-3 text-[12px] font-medium text-tertiary">
                  {c.title}
                </div>
                <ul className="space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <FooterLink {...l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 pt-6 text-[12.5px] text-tertiary shadow-[inset_0_1px_0_0_var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Codarc</span>
          <a
            href="https://x.com/C0darc"
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-secondary"
          >
            @C0darc
          </a>
        </div>
      </Container>
    </footer>
  );
}
