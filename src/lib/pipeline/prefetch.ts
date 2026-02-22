import { z } from "zod";
import { fetchFileContent } from "@/lib/github";

const DEFAULT_MAX_LINES = 120;
const DEFAULT_CONCURRENCY = 10;

export interface PreFetchedFile {
  path: string;
  content: string;
}

/** Schema for the LLM file picker structured output */
export const filePickerSchema = z.object({
  files: z.array(z.string()),
});

export async function prefetchFiles(
  owner: string,
  repo: string,
  paths: string[],
  shas?: Map<string, string>,
  maxLines = DEFAULT_MAX_LINES,
): Promise<PreFetchedFile[]> {
  const queue = [...paths];
  const fulfilled: PreFetchedFile[] = [];
  const failed: string[] = [];

  async function worker() {
    while (queue.length > 0) {
      const path = queue.shift()!;
      try {
        const file = await fetchFileContent(owner, repo, path, shas?.get(path));
        const lines = file.content.split("\n");
        const content =
          lines.length > maxLines
            ? lines.slice(0, maxLines).join("\n") +
              `\n\n[Truncated: showing ${maxLines} of ${lines.length} lines]`
            : file.content;
        fulfilled.push({ path, content });
      } catch {
        failed.push(path);
      }
    }
  }

  const concurrency = Math.min(DEFAULT_CONCURRENCY, paths.length);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (failed.length > 0) {
    console.warn(
      "[pipeline] Failed to fetch %d/%d files: %s",
      failed.length, paths.length, failed.join(", "),
    );
  }

  return fulfilled;
}
