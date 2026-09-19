import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/workspace";

type Params = { params: Promise<{ owner: string; repo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { owner, repo } = await params;
  return {
    title: `${owner}/${repo} · Codarc`,
    description: `The architecture map for ${owner}/${repo}.`,
  };
}

export default async function RepoPage({ params }: Params) {
  const { owner, repo } = await params;
  return <Workspace owner={owner} repo={repo} />;
}
