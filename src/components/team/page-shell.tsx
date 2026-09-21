import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/logo";

/** The quiet frame around account pages: logo, a way back, a reading column. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="Codarc home">
          <Wordmark size="md" />
        </Link>
        <Link
          href="/"
          className="notion-hover ml-auto flex items-center gap-1.5 px-2 py-1 text-[13.5px] text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[640px] px-6 pt-8 pb-24">{children}</main>
    </div>
  );
}
