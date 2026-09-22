import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/** A wrong address gets a way back, in Codarc's own voice. */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-page px-6">
      <div className="w-[min(440px,100%)] rounded-xl bg-raised p-6 shadow-popover">
        <Wordmark size="sm" />
        <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.015em] text-primary">
          There&apos;s nothing at this address
        </h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-secondary">
          The link may be old, or missing a piece. Your projects are one click away.
        </p>
        {/* "/" sends signed-in people to their dashboard and everyone else home. */}
        <Link href="/" className="mt-5 inline-block">
          <Button variant="primary" size="lg">
            Back to your projects
          </Button>
        </Link>
      </div>
    </div>
  );
}
