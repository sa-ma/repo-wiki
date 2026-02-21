import { generateWiki } from "@/lib/pipeline";
import { WikiShell } from "@/components/wiki/wiki-shell";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  const wiki = await generateWiki(owner, repo);

  return <WikiShell wiki={wiki} />;
}
