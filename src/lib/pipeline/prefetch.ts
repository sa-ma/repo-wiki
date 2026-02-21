import { z } from "zod";
import { fetchFileContent } from "@/lib/github";

const MAX_LINES_PER_FILE = 200;

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
): Promise<PreFetchedFile[]> {
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const file = await fetchFileContent(owner, repo, path);
      const lines = file.content.split("\n");
      const content =
        lines.length > MAX_LINES_PER_FILE
          ? lines.slice(0, MAX_LINES_PER_FILE).join("\n") +
            `\n\n[Truncated: showing ${MAX_LINES_PER_FILE} of ${lines.length} lines]`
          : file.content;
      return { path, content };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PreFetchedFile> => r.status === "fulfilled")
    .map((r) => r.value);
}
