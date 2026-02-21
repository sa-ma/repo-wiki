import { octokit } from "./client";
import { GitHubError, mapOctokitError } from "./errors";
import type { FileContent } from "./types";

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  sha?: string,
): Promise<FileContent> {
  try {
    const response = await octokit.rest.repos.getContent({ owner, repo, path });
    const data = response.data;

    if (Array.isArray(data) || data.type !== "file") {
      throw new GitHubError(`Path is not a file: ${path}`, "NOT_FOUND", 404);
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");

    if (isBinary(content)) {
      return { path, content: "", size: data.size, sha: data.sha, truncated: true };
    }

    return {
      path,
      content,
      size: data.size,
      sha: data.sha,
      truncated: false,
    };
  } catch (error) {
    if (error instanceof GitHubError) throw error;

    // Files >1MB return 403 from Contents API — fall back to Blobs API
    if (isFileTooLargeError(error)) {
      return fetchViaBlob(owner, repo, path, sha);
    }

    throw mapOctokitError(error);
  }
}

async function fetchViaBlob(
  owner: string,
  repo: string,
  path: string,
  sha?: string,
): Promise<FileContent> {
  try {
    // Use the SHA from the tree if available; otherwise fall back to getContent
    let fileSha = sha;
    if (!fileSha) {
      const treeResponse = await octokit.rest.repos.getContent({ owner, repo, path });
      const data = treeResponse.data;
      if (Array.isArray(data) || data.type !== "file") {
        throw new GitHubError(`Path is not a file: ${path}`, "NOT_FOUND", 404);
      }
      fileSha = data.sha;
    }

    const blobResponse = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: fileSha,
    });

    const content = Buffer.from(blobResponse.data.content, "base64").toString("utf-8");

    if (isBinary(content)) {
      return { path, content: "", size: blobResponse.data.size ?? 0, sha: fileSha, truncated: true };
    }

    return {
      path,
      content,
      size: blobResponse.data.size ?? 0,
      sha: fileSha,
      truncated: false,
    };
  } catch (error) {
    if (error instanceof GitHubError) throw error;
    throw new GitHubError(
      `File too large to fetch: ${path}`,
      "FILE_TOO_LARGE",
    );
  }
}

function isFileTooLargeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 403 &&
    "message" in error &&
    typeof (error as { message: string }).message === "string" &&
    (error as { message: string }).message.toLowerCase().includes("too large")
  );
}

function isBinary(content: string): boolean {
  const sample = content.slice(0, 512);
  return sample.includes("\0");
}
