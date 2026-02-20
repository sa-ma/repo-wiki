import { RequestError } from "octokit";
import type { GitHubErrorCode } from "./types";

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly code: GitHubErrorCode,
    public readonly status?: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export function mapOctokitError(error: unknown): GitHubError {
  if (error instanceof GitHubError) return error;

  if (error instanceof RequestError) {
    if (error.status === 404) {
      return new GitHubError(
        "Repository not found or is private",
        "NOT_FOUND",
        404,
      );
    }

    if (error.status === 403) {
      const rateLimitRemaining = error.response?.headers?.["x-ratelimit-remaining"];
      if (rateLimitRemaining === "0") {
        const resetHeader = error.response?.headers?.["x-ratelimit-reset"];
        const retryAfter = resetHeader
          ? Number(resetHeader) - Math.floor(Date.now() / 1000)
          : undefined;
        return new GitHubError(
          "GitHub API rate limit exceeded",
          "RATE_LIMITED",
          403,
          retryAfter,
        );
      }

      return new GitHubError(
        "Repository not found or is private",
        "NOT_FOUND",
        403,
      );
    }

    return new GitHubError(
      error.message,
      "UNKNOWN",
      error.status,
    );
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new GitHubError(
      "Network error connecting to GitHub",
      "NETWORK_ERROR",
    );
  }

  return new GitHubError(
    error instanceof Error ? error.message : "Unknown error",
    "UNKNOWN",
  );
}
