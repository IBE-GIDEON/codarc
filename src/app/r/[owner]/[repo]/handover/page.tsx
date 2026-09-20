import type { Metadata } from "next";
import { HandoverView } from "@/components/workspace/handover-view";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { owner, repo } = await params;
  return {
    title: `${repo} — how it works · Codarc`,
    description: `A plain-English guide to ${owner}/${repo}.`,
  };
}

export default async function HandoverPage({ params }: Params) {
  const { owner, repo } = await params;
  return <HandoverView owner={owner} repo={repo} />;
}
