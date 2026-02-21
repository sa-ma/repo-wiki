import { generateWikiWithProgress } from "@/lib/pipeline";
import { GitHubError } from "@/lib/github";
import type { SSEEvent } from "@/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;

  if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return new Response("Invalid owner or repo", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: SSEEvent) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        const wiki = await generateWikiWithProgress(owner, repo, (progress) => {
          send("progress", progress);
        });

        send("complete", { phase: "complete", wiki });
      } catch (error) {
        send("error", mapErrorToSSE(error));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function mapErrorToSSE(error: unknown): SSEEvent {
  if (error instanceof GitHubError) {
    return {
      phase: "error",
      code: error.code,
      message: getUserFacingMessage(error),
      retryAfter: error.retryAfter,
    };
  }

  if (error instanceof Error && error.message.includes("output")) {
    return {
      phase: "error",
      code: "AI_ERROR",
      message:
        "The AI model failed to generate structured output. Please try again.",
    };
  }

  return {
    phase: "error",
    code: "PIPELINE_ERROR",
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

function getUserFacingMessage(error: GitHubError): string {
  switch (error.code) {
    case "NOT_FOUND":
      return "This repository was not found. It may be private or the URL may be incorrect.";
    case "RATE_LIMITED":
      return error.retryAfter
        ? `GitHub API rate limit exceeded. Try again in ${formatDuration(error.retryAfter)}.`
        : "GitHub API rate limit exceeded. Try again later.";
    case "FILE_TOO_LARGE":
      return "This repository is too large to process.";
    case "NETWORK_ERROR":
      return "Could not connect to GitHub. Please check your connection and try again.";
    default:
      return error.message;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
