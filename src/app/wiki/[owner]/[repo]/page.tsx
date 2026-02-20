import { fetchRepoMeta, fetchRepoTree } from "@/lib/github";
import { mockWiki } from "@/lib/mock/wiki";
import { WikiShell } from "@/components/wiki/wiki-shell";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  // Phase 1 smoke test: fetch real GitHub data and log it
  try {
    const meta = await fetchRepoMeta(owner, repo);
    const tree = await fetchRepoTree(owner, repo, meta.defaultBranch);

    console.log("[github] Repo:", meta.fullName);
    console.log("[github] Description:", meta.description);
    console.log("[github] Default branch:", meta.defaultBranch);
    console.log("[github] Stars:", meta.stars);
    console.log("[github] Languages:", Object.keys(meta.languages).join(", "));
    console.log("[github] README:", meta.readme ? `${meta.readme.length} chars` : "none");
    console.log("[github] Tree: %d files (cleaned from %d total, truncated: %s)",
      tree.nodes.length, tree.totalFiles, tree.truncated);
    console.log("[github] Sample files:", tree.nodes.slice(0, 15).map((n) => n.path));
  } catch (error) {
    console.error("[github] Failed:", error);
  }

  // TODO: Replace with real pipeline — Phase 2 will generate wiki from GitHub data
  const wiki = { ...mockWiki, repoUrl: `https://github.com/${owner}/${repo}` };

  return <WikiShell wiki={wiki} />;
}
