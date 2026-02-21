import { getCachedWiki } from "@/lib/pipeline";
import { WikiShell } from "@/components/wiki/wiki-shell";
import { WikiGenerator } from "@/components/wiki/wiki-generator";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const cached = getCachedWiki(owner, repo);

  if (cached) {
    return <WikiShell wiki={cached} />;
  }

  return <WikiGenerator owner={owner} repo={repo} />;
}
