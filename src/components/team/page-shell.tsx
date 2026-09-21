import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/logo";

/**
 * The quiet frame around account pages: logo, a way back, a reading column.
 * "Back" means your dashboard once you're signed in — the landing page is
 * only for people who haven't met Codarc yet.
 */
export function PageShell({
  children,
  home = "/dashboard",
}: {
  children: React.ReactNode;
  home?: string;
}) {
  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center px-6">
        <Link href={home} aria-label="Codarc home">
          <Wordmark size="md" />
        </Link>
        <Link
          href={home}
          className="notion-hover ml-auto flex items-center gap-1.5 px-2 py-1 text-[13.5px] text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> {home === "/dashboard" ? "Back to your projects" : "Back"}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[640px] px-6 pt-8 pb-24">{children}</main>
    </div>
  );
}
