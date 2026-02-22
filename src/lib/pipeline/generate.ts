import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { fetchRepoMeta, fetchRepoTree } from "@/lib/github";
import { GitHubError } from "@/lib/github/errors";
import type { Wiki, Feature, ProgressEvent, FeatureCompleteEvent } from "@/types";
import type { RepoTree } from "@/lib/github";
import { architectureAnalysisSchema, featureDeepDiveSchema } from "./schemas";
import type { ArchitectureAnalysis, FeaturePlan, FeatureDeepDive } from "./schemas";
import {
  buildArchitectureAnalysisPrompt,
  buildArchitectureAnalysisContext,
  buildFeatureDeepDivePrompt,
  buildFeatureDeepDiveContext,
} from "./prompts";
import { prefetchFiles } from "./prefetch";
import type { PreFetchedFile } from "./prefetch";
import { getCachedWiki, setCachedWiki } from "./cache";

export type ProgressCallback = (event: ProgressEvent | FeatureCompleteEvent) => void;

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
    onProgress({ phase: "generating_features", message: "Generation in progress...", progress: 50 });
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

/* ─── Config file detection ─── */

const CONFIG_FILENAMES = new Set([
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "go.mod",
  "build.gradle",
  "build.gradle.kts",
  "pom.xml",
  "Gemfile",
  "mix.exs",
  "deno.json",
  "deno.jsonc",
  "composer.json",
]);

function findConfigFiles(tree: RepoTree): string[] {
  return tree.nodes
    .filter((n) => {
      const segments = n.path.split("/");
      // Root level or one level deep
      if (segments.length > 2) return false;
      const filename = segments[segments.length - 1];
      return CONFIG_FILENAMES.has(filename);
    })
    .map((n) => n.path);
}

/* ─── Citation URL helper ─── */

function buildCitationUrl(
  baseUrl: string,
  file: string,
  startLine: number,
  endLine: number,
): string {
  return `${baseUrl}/${file}#L${startLine}-L${endLine}`;
}

/* ─── Transform LLM output to Feature with citation URLs ─── */

function transformFeature(data: FeatureDeepDive, baseUrl: string): Feature {
  return {
    id: data.id,
    name: data.name,
    summary: data.summary,
    relatedFeatures: data.relatedFeatures,
    sections: data.sections.map((s) => ({
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
  };
}

/* ─── Main Pipeline ─── */

async function runPipeline(
  owner: string,
  repo: string,
  onProgress?: ProgressCallback,
): Promise<Wiki> {
  const pipelineStart = Date.now();

  // ── Phase 1: Repo Scan ──

  onProgress?.({
    phase: "fetching_metadata",
    message: "Fetching repository data...",
    progress: 5,
  });

  const metaResult = await fetchRepoMeta(owner, repo);
  const treeResult = await fetchRepoTree(owner, repo, metaResult.defaultBranch);

  if (treeResult.nodes.length > 10_000) {
    throw new GitHubError(
      "This repository is too large to process (over 10,000 source files after filtering)",
      "FILE_TOO_LARGE",
    );
  }

  if (treeResult.truncated) {
    console.warn(
      "[pipeline] WARNING: Git tree for %s/%s was truncated by GitHub — wiki may be incomplete",
      owner, repo,
    );
  }

  // Fetch config files
  const configPaths = findConfigFiles(treeResult);
  const shas = new Map(treeResult.nodes.map((n) => [n.path, n.sha]));
  const configFiles = configPaths.length > 0
    ? await prefetchFiles(owner, repo, configPaths, shas)
    : [];

  const gatherTime = Date.now() - pipelineStart;
  console.log(
    "[pipeline] Phase 1 complete: %s/%s in %dms (%d files, %d configs)",
    owner, repo, gatherTime, treeResult.nodes.length, configFiles.length,
  );

  // ── Phase 2: Architecture Analysis ──

  onProgress?.({
    phase: "analyzing_architecture",
    message: "Analyzing codebase architecture...",
    progress: 15,
    detail: `${treeResult.nodes.length} files in tree`,
  });

  const analysisStart = Date.now();
  const analysisResult = await generateText({
    model: openai("gpt-5-mini"),
    system: buildArchitectureAnalysisPrompt(),
    prompt: buildArchitectureAnalysisContext(metaResult, treeResult, configFiles),
    output: Output.object({ schema: architectureAnalysisSchema }),
    maxOutputTokens: 4096,
    providerOptions: {
      openai: { reasoningEffort: "minimal" },
    },
  });

  const analysisTime = Date.now() - analysisStart;
  console.log(
    "[pipeline] Phase 2 LLM: finish=%s, tokens=%d/%d",
    analysisResult.finishReason,
    analysisResult.usage?.outputTokens ?? 0, 4096,
  );

  if (!analysisResult.output) {
    throw new Error("Architecture analysis failed to produce output");
  }

  const analysis: ArchitectureAnalysis = analysisResult.output;

  // Validate file paths against actual tree
  const treePaths = new Set(treeResult.nodes.map((n) => n.path));
  for (const feature of analysis.features) {
    feature.filePaths = feature.filePaths.filter((p) => treePaths.has(p));
  }

  // Cap feature count to avoid runaway LLM output
  const MAX_FEATURES = 15;
  if (analysis.features.length > MAX_FEATURES) {
    console.warn(
      "[pipeline] Capping features from %d to %d",
      analysis.features.length, MAX_FEATURES,
    );
    analysis.features = analysis.features.slice(0, MAX_FEATURES);
  }

  console.log(
    "[pipeline] Phase 2 complete: %d features identified in %dms",
    analysis.features.length, analysisTime,
  );
  for (const f of analysis.features) {
    console.log("[pipeline]   - %s (%s): %d files", f.name, f.id, f.filePaths.length);
  }

  // ── Phase 3: Parallel Per-Feature Generation ──

  const baseUrl = `https://github.com/${owner}/${repo}/blob/${metaResult.defaultBranch}`;
  const FEATURE_MAX_LINES = 150;
  const FEATURE_MAX_FILES = 10;

  // Batch-prefetch ALL files across ALL features upfront (deduplicated)
  const allFilePaths = [...new Set(
    analysis.features.flatMap((f) => f.filePaths.slice(0, FEATURE_MAX_FILES)),
  )];

  onProgress?.({
    phase: "generating_features",
    message: `Fetching ${allFilePaths.length} source files...`,
    progress: 25,
    featuresTotal: analysis.features.length,
    featuresComplete: 0,
  });

  const prefetchStart = Date.now();
  const allFiles = await prefetchFiles(owner, repo, allFilePaths, shas, FEATURE_MAX_LINES);
  const prefetchedMap = new Map(allFiles.map((f) => [f.path, f]));
  console.log(
    "[pipeline] Prefetched %d/%d files in %dms",
    allFiles.length, allFilePaths.length, Date.now() - prefetchStart,
  );

  onProgress?.({
    phase: "generating_features",
    message: "Generating feature documentation...",
    progress: 30,
    featuresTotal: analysis.features.length,
    featuresComplete: 0,
  });

  const featureGenStart = Date.now();

  function getCachedFiles(paths: string[]): PreFetchedFile[] {
    return paths
      .slice(0, FEATURE_MAX_FILES)
      .map((p) => prefetchedMap.get(p))
      .filter((f): f is PreFetchedFile => f !== undefined);
  }

  let featuresComplete = 0;
  const featuresTotal = analysis.features.length;
  const LLM_BATCH_SIZE = 3;

  async function generateOneFeature(
    featurePlan: FeaturePlan,
    index: number,
  ): Promise<Feature> {
    const files = getCachedFiles(featurePlan.filePaths);

    if (files.length === 0) {
      throw new Error(`No files fetched for feature "${featurePlan.name}"`);
    }

    const context = buildFeatureDeepDiveContext(metaResult, treeResult, featurePlan, files, analysis);
    console.log(
      "[pipeline]   Feature '%s': %d files, %d chars context",
      featurePlan.name, files.length, context.length,
    );

    const start = Date.now();
    const llmResult = await generateText({
      model: openai("gpt-5-mini"),
      system: buildFeatureDeepDivePrompt(),
      prompt: context,
      output: Output.object({ schema: featureDeepDiveSchema }),
      maxOutputTokens: 16384,
      providerOptions: {
        openai: { reasoningEffort: "low" },
      },
    });

    const elapsed = Date.now() - start;
    console.log(
      "[pipeline]   Feature '%s' LLM done in %dms (finish: %s, tokens: %d/%d)",
      featurePlan.name, elapsed, llmResult.finishReason,
      llmResult.usage?.outputTokens ?? 0, 16384,
    );

    if (!llmResult.output) {
      throw new Error(
        `No structured output (finish: ${llmResult.finishReason}, tokens: ${llmResult.usage?.outputTokens ?? "?"}/${16384})`,
      );
    }

    const feature = transformFeature(llmResult.output, baseUrl);
    featuresComplete++;

    onProgress?.({
      phase: "feature_complete",
      feature,
      featureIndex: index,
      featuresTotal,
      featuresComplete,
    });

    onProgress?.({
      phase: "generating_features",
      message: `Generated ${featuresComplete} of ${featuresTotal} features...`,
      progress: 30 + (featuresComplete / featuresTotal) * 60,
      featuresTotal,
      featuresComplete,
    });

    return feature;
  }

  // Process in small batches — batch waits to fully complete before next starts
  // to avoid stale connection reuse
  const featureResults: PromiseSettledResult<Feature>[] = [];

  for (let i = 0; i < analysis.features.length; i += LLM_BATCH_SIZE) {
    const batchResults = await Promise.allSettled(
      analysis.features
        .slice(i, i + LLM_BATCH_SIZE)
        .map((fp, batchIdx) => generateOneFeature(fp, i + batchIdx)),
    );
    featureResults.push(...batchResults);
  }

  const featureGenTime = Date.now() - featureGenStart;

  // Collect successful features
  const features: Feature[] = [];
  const failedFeatures: string[] = [];

  for (let i = 0; i < featureResults.length; i++) {
    const result = featureResults[i];
    if (result.status === "fulfilled") {
      features.push(result.value);
    } else {
      failedFeatures.push(analysis.features[i].name);
      console.error(
        "[pipeline] Feature '%s' failed: %s",
        analysis.features[i].name,
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
    }
  }

  if (features.length === 0) {
    throw new Error("All feature generation calls failed");
  }

  if (failedFeatures.length > 0) {
    console.warn(
      "[pipeline] %d/%d features failed: %s",
      failedFeatures.length, featuresTotal, failedFeatures.join(", "),
    );
  }

  console.log(
    "[pipeline] Phase 3 complete: %d/%d features in %dms",
    features.length, featuresTotal, featureGenTime,
  );

  // ── Phase 4: Assembly ──

  onProgress?.({
    phase: "assembling",
    message: "Assembling wiki...",
    progress: 95,
  });

  const wiki: Wiki = {
    repoUrl: `https://github.com/${owner}/${repo}`,
    repoName: repo,
    description: metaResult.description ?? analysis.description,
    generatedAt: new Date().toISOString(),
    features,
  };

  const totalTime = Date.now() - pipelineStart;
  console.log(
    "[pipeline] Done: %d features in %dms (gather: %dms, analysis: %dms, features: %dms)",
    wiki.features.length, totalTime, gatherTime, analysisTime, featureGenTime,
  );

  setCachedWiki(owner, repo, wiki);
  return wiki;
}
