import { octokit } from "./client";
import { GitHubError, mapOctokitError } from "./errors";
import type { RepoMeta, RepoTree, TreeNode } from "./types";

export async function fetchRepoMeta(
  owner: string,
  repo: string,
): Promise<RepoMeta> {
  const [repoResult, languagesResult, readmeResult] = await Promise.allSettled([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.repos.listLanguages({ owner, repo }),
    octokit.rest.repos.getReadme({
      owner,
      repo,
      mediaType: { format: "raw" },
    }),
  ]);

  if (repoResult.status === "rejected") {
    throw mapOctokitError(repoResult.reason);
  }

  const r = repoResult.value.data;
  const languages =
    languagesResult.status === "fulfilled" ? languagesResult.value.data : {};
  const readme =
    readmeResult.status === "fulfilled"
      ? (readmeResult.value.data as unknown as string)
      : null;

  return {
    owner,
    repo,
    fullName: r.full_name,
    description: r.description,
    defaultBranch: r.default_branch,
    language: r.language,
    languages,
    stars: r.stargazers_count,
    readme,
    topics: r.topics ?? [],
  };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  defaultBranch: string = "main",
): Promise<RepoTree> {
  try {
    const response = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "1",
    });

    const allNodes = response.data.tree;
    const totalFiles = allNodes.filter((n) => n.type === "blob").length;

    const nodes: TreeNode[] = allNodes
      .filter((n): n is typeof n & { type: "blob" } => n.type === "blob")
      .filter((n) => isCleanPath(n.path ?? ""))
      .map((n) => ({
        path: n.path!,
        type: "blob" as const,
        size: n.size ?? null,
        sha: n.sha!,
      }));

    return {
      totalFiles,
      truncated: response.data.truncated ?? false,
      nodes,
    };
  } catch (error) {
    throw mapOctokitError(error);
  }
}

// --- Tree cleaning ---

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  "out",
  ".output",
  "coverage",
  "__pycache__",
  ".cache",
  ".turbo",
  ".vercel",
  "vendor",
  "venv",
  ".venv",
  "target",
  ".gradle",
  ".idea",
  ".vscode",
  "storybook-static",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif",
  ".woff", ".woff2", ".ttf", ".eot",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm",
  ".zip", ".tar", ".gz", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".wasm", ".pyc", ".class",
  ".lock", ".map",
]);

const EXCLUDED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".DS_Store",
]);

function isCleanPath(path: string): boolean {
  const segments = path.split("/");
  const filename = segments[segments.length - 1];

  if (EXCLUDED_FILENAMES.has(filename)) return false;

  for (const segment of segments) {
    if (EXCLUDED_DIRS.has(segment)) return false;
  }

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = filename.slice(dotIndex).toLowerCase();
    if (EXCLUDED_EXTENSIONS.has(ext)) return false;
  }

  return true;
}
