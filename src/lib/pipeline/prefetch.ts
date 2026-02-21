import { z } from "zod";
import { fetchFileContent } from "@/lib/github";

const MAX_LINES_PER_FILE = 120;

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
): Promise<PreFetchedFile[]> {
  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const file = await fetchFileContent(owner, repo, path, shas?.get(path));
      const lines = file.content.split("\n");
      const content =
        lines.length > MAX_LINES_PER_FILE
          ? lines.slice(0, MAX_LINES_PER_FILE).join("\n") +
            `\n\n[Truncated: showing ${MAX_LINES_PER_FILE} of ${lines.length} lines]`
          : file.content;
      return { path, content };
    }),
  );

  const fulfilled: PreFetchedFile[] = [];
  const failed: string[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      fulfilled.push((results[i] as PromiseFulfilledResult<PreFetchedFile>).value);
    } else {
      failed.push(paths[i]);
    }
  }

  if (failed.length > 0) {
    console.warn(
      "[pipeline] Failed to fetch %d/%d files: %s",
      failed.length, paths.length, failed.join(", "),
    );
  }

  return fulfilled;
}
