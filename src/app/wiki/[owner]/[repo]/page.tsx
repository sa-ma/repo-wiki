import { mockWiki } from "@/lib/mock/wiki";
import { WikiShell } from "@/components/wiki/wiki-shell";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  // TODO: Replace with real pipeline — fetch repo, analyze, generate wiki
  // For now, serve mock data regardless of owner/repo
  const wiki = { ...mockWiki, repoUrl: `https://github.com/${owner}/${repo}` };

  return <WikiShell wiki={wiki} />;
}
