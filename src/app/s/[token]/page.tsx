import type { Metadata } from "next";
import Link from "next/link";
import crypto from "node:crypto";
import { decodeShare } from "@/lib/share";
import { Workspace } from "@/components/workspace/workspace";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const decoded = decodeShare(token);
  if (!decoded.ok) return { title: "Shared map · Codarc" };
  const { share } = decoded;
  return {
    title: `${share.repo} — shared by ${share.sharedBy.name} · Codarc`,
    description:
      share.note ?? `A map of ${share.owner}/${share.repo}, drawn by Codarc.`,
  };
}

export default async function SharedMapPage({ params }: Params) {
  const { token } = await params;
  const decoded = decodeShare(token);

  if (!decoded.ok) {
    const expired = decoded.reason === "expired";
    return (
      <div className="grid min-h-dvh place-items-center bg-page px-6">
        <div className="w-[min(440px,100%)] rounded-xl bg-raised p-6 shadow-popover">
          <Wordmark size="sm" />
          <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.015em] text-primary">
            {expired ? "This link has expired" : "This link doesn't work"}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.6] text-secondary">
            {expired
              ? "Shared maps last 90 days. Ask whoever sent it for a fresh one."
              : "It may have been copied incompletely. Ask whoever sent it to share it again."}
          </p>
          <Link href="/" className="mt-5 inline-block">
            <Button variant="secondary" size="lg">
              Map your own app
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { share } = decoded;

  // A short, stable key per link, so a viewer's own nudges persist between
  // visits without ever touching the owner's saved layout.
  const layoutKey = `codarc-layout:shared:${crypto
    .createHash("sha256")
    .update(token)
    .digest("base64url")
    .slice(0, 16)}`;

  return (
    <Workspace
      owner={share.owner}
      repo={share.repo}
      shared={{
        sharedBy: share.sharedBy,
        sharedAt: share.sharedAt,
        note: share.note,
        focus: share.focus,
        offsets: share.offsets,
        layoutKey,
      }}
    />
  );
}
