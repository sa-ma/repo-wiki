import type { RepoMeta, RepoTree } from "@/lib/github";
import type { PreFetchedFile } from "./prefetch";

const MAX_TREE_FILES_PICKER = 2000;
const MAX_TREE_FILES_WIKI = 500;

const PICKER_EXCLUDED_DIRS = new Set([
  "test", "tests", "__tests__", "spec", "specs",
  "bench", "benchmark", "benchmarks",
  "examples", "example",
  "docs", "documentation", "doc",
  "fixtures", "__fixtures__", "testdata",
  ".github", ".circleci", ".husky",
  "scripts", "tools",
  "e2e", "cypress", "playwright",
]);

export function buildFilePickerPrompt(): string {
  return `You are a code analyst selecting files to read from a GitHub repository. Your goal is to pick the ~15 most important files that will be used to generate a wiki about this project's user-facing features.

## Selection criteria

- **Actual source implementations**: pick files that contain real function definitions, component implementations, class definitions, and exported APIs — not shallow wrappers
- **Files in the project's primary language**: if it's a JavaScript/TypeScript framework, pick JS/TS source files, not internal Rust/C++ compiler code
- **Prefer \`src/\` over root-level re-exports**: files like \`packages/foo/image.js\` that just do \`module.exports = require('./dist/...')\` are useless — pick the actual source file in \`src/\` that defines the component/function instead
- **Configuration that reveals features**: package.json of the main package
- **README is already provided** — do not include it

## What to skip

- **Trivial re-export/wrapper files** — one-liners that just re-export from dist/ or another path. These contain no useful information.
- Tests, test fixtures, test utilities
- Build configs, CI/CD, linting configs
- Lock files, generated files, changelogs, license files
- Benchmarks, examples, documentation source files
- Type declaration files (.d.ts) unless they ARE the public API
- **Internal compiler/build tool code in a different language** — e.g., Rust crates that implement a JS framework's compiler are internals, not user-facing code

## Monorepos

If this is a monorepo (multiple packages/apps), focus on the **primary/core package** — usually the one matching the repository name. For example, in vercel/next.js, focus on \`packages/next/\`, not \`apps/\`, \`bench/\`, or \`crates/\`.

## Output

Return exactly the file paths as they appear in the directory tree. Pick up to 15 files.`;
}

export function buildFilePickerContext(meta: RepoMeta, tree: RepoTree): string {
  const filteredNodes = tree.nodes.filter((n) => {
    const segments = n.path.split("/");
    return !segments.some((s) => PICKER_EXCLUDED_DIRS.has(s));
  });

  const treeListing = filteredNodes
    .slice(0, MAX_TREE_FILES_PICKER)
    .map((n) => n.path)
    .join("\n");

  const treeNote =
    filteredNodes.length > MAX_TREE_FILES_PICKER
      ? `\n(Showing ${MAX_TREE_FILES_PICKER} of ${filteredNodes.length} source files)`
      : "";

  const readmeSection = meta.readme
    ? `## README\n\n${meta.readme}`
    : "(No README available)";

  return `## Repository: ${meta.fullName}
Description: ${meta.description ?? "No description"}
Primary language: ${meta.language ?? "Unknown"}
Languages: ${Object.keys(meta.languages).join(", ") || "Unknown"}
Topics: ${meta.topics.join(", ") || "None"}
Stars: ${meta.stars}

${readmeSection}

## Directory Structure (source files only, tests/benchmarks/examples excluded)
\`\`\`
${treeListing}${treeNote}
\`\`\``;
}

export function buildWikiPrompt(): string {
  return `You are a code analyst. Given a repository's metadata, directory structure, and key source files, produce a structured wiki of its user-facing features.

## Rules

1. **Identify 5 to 8 user-facing features** — what the software does from a user's or developer's perspective. Use the README and project description as your primary guide for what the features are, then use the source files as evidence and for citations.

2. **What counts as a feature:**
   - A distinct capability a user interacts with (e.g., "State Management", "Routing", "Image Optimization", "Data Fetching")
   - Group related sub-capabilities together. For example, if a library has 5 middleware, that's ONE feature called "Middleware System" — not 5 separate features.
   - Internal implementation details (compiler internals, build config, test infrastructure) are NOT features.

3. **Write from the user's perspective** — explain what users can do and how they use each feature. Show the public API and usage patterns, not internal implementation details.

4. **For each feature, produce 2-4 sections** (e.g., Overview, Key APIs, Usage).

5. **Code snippets should show the public API** — the functions, components, or patterns that users import and call. If a source file shows internal implementation, cite it but describe the user-facing API it enables. Prefer code that shows exports, public functions, or usage patterns.

6. **Citations must use exact file paths and line numbers** from the provided files. Use empty arrays if you have no citations for a section.

7. **Code snippets must be copied verbatim** from the provided files, with accurate file paths and line numbers. Never fabricate code.

8. **Feature IDs** should be kebab-case (e.g., "state-management").

9. **relatedFeatures** should reference other feature IDs from your output.

10. Only use information from the provided context. Do not invent file paths, line numbers, or code.`;
}

export function buildContextString(
  meta: RepoMeta,
  tree: RepoTree,
  files: PreFetchedFile[],
): string {
  const treeListing = tree.nodes
    .slice(0, MAX_TREE_FILES_WIKI)
    .map((n) => n.path)
    .join("\n");

  const treeNote =
    tree.nodes.length > MAX_TREE_FILES_WIKI
      ? `\n(Showing ${MAX_TREE_FILES_WIKI} of ${tree.nodes.length} files)`
      : "";

  const readmeSection = meta.readme
    ? `## README\n\n${meta.readme}`
    : "(No README available)";

  const filesSections = files
    .map((f) => {
      const ext = f.path.split(".").pop() ?? "";
      const lang = extToLang(ext);
      return `### ${f.path}\n\`\`\`${lang}\n${f.content}\n\`\`\``;
    })
    .join("\n\n");

  return `## Repository: ${meta.fullName}
Description: ${meta.description ?? "No description"}
Primary language: ${meta.language ?? "Unknown"}
Languages: ${Object.keys(meta.languages).join(", ") || "Unknown"}
Topics: ${meta.topics.join(", ") || "None"}
Stars: ${meta.stars}

${readmeSection}

## Directory Structure
\`\`\`
${treeListing}${treeNote}
\`\`\`

## Key Files

${filesSections}`;
}

function extToLang(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    rb: "ruby",
    java: "java",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
  };
  return map[ext] ?? ext;
}
