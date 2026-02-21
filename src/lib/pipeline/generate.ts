import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchRepoMeta, fetchRepoTree } from "@/lib/github";
import { GitHubError } from "@/lib/github/errors";
import type { Wiki, ProgressEvent } from "@/types";
import { wikiModelSchema } from "./schemas";
import { buildFilePickerPrompt, buildFilePickerContext, buildWikiPrompt, buildContextString } from "./prompts";
import { filePickerSchema, prefetchFiles } from "./prefetch";
import { getCachedWiki, setCachedWiki } from "./cache";

export type ProgressCallback = (event: ProgressEvent) => void;

const inflight = new Map<string, Promise<Wiki>>();

function inflightKey(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export async function generateWiki(owner: string, repo: string): Promise<Wiki> {
  const cached = getCachedWiki(owner, repo);
  if (cached) {
    console.log("[pipeline] Cache hit for %s/%s", owner, repo);
    return cached;
  }

  const key = inflightKey(owner, repo);
  const existing = inflight.get(key);
  if (existing) {
    console.log("[pipeline] Joining in-flight request for %s/%s", owner, repo);
    return existing;
  }

  const promise = runPipeline(owner, repo);
  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export async function generateWikiWithProgress(
  owner: string,
  repo: string,
  onProgress: ProgressCallback,
): Promise<Wiki> {
  const cached = getCachedWiki(owner, repo);
  if (cached) {
    console.log("[pipeline] Cache hit for %s/%s", owner, repo);
    return cached;
  }

  const key = inflightKey(owner, repo);
  const existing = inflight.get(key);
  if (existing) {
    console.log("[pipeline] Joining in-flight request for %s/%s", owner, repo);
    onProgress({ phase: "generating_wiki", message: "Generation in progress...", progress: 50 });
    return existing;
  }

  const promise = runPipeline(owner, repo, onProgress);
  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

async function runPipeline(
  owner: string,
  repo: string,
  onProgress?: ProgressCallback,
): Promise<Wiki> {
  const pipelineStart = Date.now();

  onProgress?.({
    phase: "fetching_metadata",
    message: "Fetching repository data...",
    progress: 5,
  });

  const meta = await fetchRepoMeta(owner, repo);
  const tree = await fetchRepoTree(owner, repo, meta.defaultBranch);

  if (tree.nodes.length > 10_000) {
    throw new GitHubError(
      "This repository is too large to process (over 10,000 source files after filtering)",
      "FILE_TOO_LARGE",
    );
  }

  const gatherTime = Date.now() - pipelineStart;
  console.log(
    "[pipeline] Fetched metadata + tree for %s/%s in %dms (%d files)",
    owner, repo, gatherTime, tree.nodes.length,
  );

  onProgress?.({
    phase: "picking_files",
    message: "Analyzing source code...",
    progress: 15,
    detail: `${tree.nodes.length} files in tree`,
  });

  const pickerStart = Date.now();
  const pickerResult = await generateText({
    model: openai("gpt-5-mini"),
    system: buildFilePickerPrompt(),
    prompt: buildFilePickerContext(meta, tree),
    output: Output.object({ schema: filePickerSchema }),
    maxOutputTokens: 2048,
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
  });

  const pickerTime = Date.now() - pickerStart;

  if (!pickerResult.output) {
    throw new Error("File picker failed to produce output");
  }

  const treePaths = new Set(tree.nodes.map((n) => n.path));
  const validPaths = pickerResult.output.files.filter((f) => treePaths.has(f));

  console.log(
    "[pipeline] File picker selected %d files (%d valid) in %dms",
    pickerResult.output.files.length, validPaths.length, pickerTime,
  );
  console.log("[pipeline] Selected files: %s", validPaths.join(", "));

  if (validPaths.length === 0) {
    throw new Error("File picker returned no valid file paths");
  }

  onProgress?.({
    phase: "fetching_files",
    message: `Reading ${validPaths.length} source files...`,
    progress: 30,
    detail: `${validPaths.length} files selected`,
  });

  const fetchStart = Date.now();
  const files = await prefetchFiles(owner, repo, validPaths);
  const fetchTime = Date.now() - fetchStart;

  console.log("[pipeline] Fetched %d files in %dms", files.length, fetchTime);

  const contextString = buildContextString(meta, tree, files);
  console.log("[pipeline] Context string: %d chars", contextString.length);

  onProgress?.({
    phase: "generating_wiki",
    message: "Generating documentation...",
    progress: 40,
    detail: `${files.length} files loaded`,
  });

  const llmStart = Date.now();
  const result = await generateText({
    model: openai("gpt-5-mini"),
    system: buildWikiPrompt(),
    prompt: contextString,
    output: Output.object({ schema: wikiModelSchema }),
    maxOutputTokens: 32768,
    providerOptions: {
      openai: { reasoningEffort: "medium" },
    },
  });

  const llmTime = Date.now() - llmStart;
  console.log("[pipeline] Wiki generation complete in %dms (finish: %s)", llmTime, result.finishReason);
  console.log("[pipeline] Usage: %o", result.usage);

  if (!result.output) {
    throw new Error("Pipeline failed to produce structured output");
  }

  const data = result.output;
  const baseUrl = `https://github.com/${owner}/${repo}/blob/${meta.defaultBranch}`;

  const wiki: Wiki = {
    repoUrl: `https://github.com/${owner}/${repo}`,
    repoName: repo,
    description: meta.description ?? data.description,
    generatedAt: new Date().toISOString(),
    features: data.features.map((f) => ({
      id: f.id,
      name: f.name,
      summary: f.summary,
      relatedFeatures: f.relatedFeatures,
      sections: f.sections.map((s) => ({
        title: s.title,
        content: s.content,
        citations: s.citations.map((c) => ({
          id: "",
          file: c.file,
          startLine: c.startLine,
          endLine: c.endLine,
          url: buildCitationUrl(baseUrl, c.file, c.startLine, c.endLine),
        })),
        codeSnippets: s.codeSnippets.map((cs) => ({
          language: cs.language,
          code: cs.code,
          citation: {
            id: "",
            file: cs.citation.file,
            startLine: cs.citation.startLine,
            endLine: cs.citation.endLine,
            url: buildCitationUrl(baseUrl, cs.citation.file, cs.citation.startLine, cs.citation.endLine),
          },
        })),
      })),
    })),
  };

  const totalTime = Date.now() - pipelineStart;
  console.log(
    "[pipeline] Done: %d features in %dms (gather: %dms, picker: %dms, fetch: %dms, llm: %dms)",
    wiki.features.length, totalTime, gatherTime, pickerTime, fetchTime, llmTime,
  );
  setCachedWiki(owner, repo, wiki);
  return wiki;
}

function buildCitationUrl(
  baseUrl: string,
  file: string,
  startLine: number,
  endLine: number,
): string {
  return `${baseUrl}/${file}#L${startLine}-L${endLine}`;
}
