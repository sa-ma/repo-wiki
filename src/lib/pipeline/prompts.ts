import type { RepoMeta, RepoTree } from "@/lib/github";
import type { PreFetchedFile } from "./prefetch";
import type { ArchitectureAnalysis, FeaturePlan } from "./schemas";

const MAX_TREE_FILES_PICKER = 2000;
const MAX_TREE_FILES_WIKI = 500;
const MAX_TREE_FILES_ARCHITECTURE = 3000;

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
  return `You are a code analyst selecting files to read from a GitHub repository. Your goal is to pick the ~10 most important files that will be used to generate a wiki about this project's user-facing features.

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

Return exactly the file paths as they appear in the directory tree. Pick up to 10 files.`;
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

/* ─── Architecture Analysis (Phase 2) ─── */

export function buildArchitectureAnalysisPrompt(): string {
  return `You are a senior software architect analyzing a GitHub repository to plan a comprehensive wiki.

## Your task

Identify the distinct **user-facing features** of this project — as many as the project genuinely has. A small CLI tool might have 3-4; a large framework might have 12+. Think about what the software does for users, not how it's technically organized. For each feature, select the 5-10 most relevant source files that implement it.

## What counts as a feature

A feature is something a user DOES with or GETS from this software. Ask: "If I were explaining this project to a new developer, what are the main things they can do with it?"

Good examples (user-facing, task-oriented):
- For an e-commerce app: "User onboarding flow", "Product search and filtering", "Shopping cart and checkout", "Order tracking"
- For a CLI tool: "Viewing files with syntax highlighting", "Rendering Markdown in the terminal", "Formatting JSON/CSV output"
- For a web framework: "Request routing and middleware", "Server-side rendering", "Data fetching and caching"

Bad examples (technical layers — NEVER do this):
- "Frontend", "Backend", "API layer", "Database", "Utils", "Configuration", "Error handling"
- These describe architecture layers, not features. A feature cuts ACROSS layers.

Group related sub-capabilities together. For example, if a library has 5 middleware types, that's ONE feature called "Middleware System" — not 5 features.

## What is NOT a feature

- Technical layers (frontend, backend, utils, helpers)
- Internal implementation details (compiler internals, build tooling, test infrastructure)
- Platform-specific internals (e.g., "Windows terminal support" is not a feature — it's a platform detail within a rendering feature)
- Individual files or classes
- "Getting Started" or "Installation"

## File selection guidance

For each feature's \`filePaths\`:
- Select **actual source files** that implement the feature (5-10 files per feature)
- Prefer files in the project's primary language
- Include the main entry points, core logic, and public API surface
- Skip: tests, docs, generated files, build configs, lock files, changelogs
- Skip: trivial re-export files that just do \`module.exports = require('./...')\`
- Some file overlap between features is fine and expected

## Monorepo awareness

If this is a monorepo, focus on the **primary/core package** — usually the one matching the repository name. Other packages can be mentioned as features if they are significant user-facing packages.

## Output

Return a JSON object with a \`description\` (1-2 sentence project summary) and a \`features\` array. Each feature needs:
- \`id\`: kebab-case identifier
- \`name\`: human-readable name
- \`description\`: 2-3 sentences explaining what this feature does FROM THE USER'S PERSPECTIVE
- \`rationale\`: why a user would want to read about this feature
- \`filePaths\`: 5-10 file paths to deep-dive into
- \`relatedFeatureIds\`: IDs of related features from your list`;
}

export function buildArchitectureAnalysisContext(
  meta: RepoMeta,
  tree: RepoTree,
  configFiles: PreFetchedFile[],
): string {
  const filteredNodes = tree.nodes.filter((n) => {
    const segments = n.path.split("/");
    return !segments.some((s) => PICKER_EXCLUDED_DIRS.has(s));
  });

  const treeListing = filteredNodes
    .slice(0, MAX_TREE_FILES_ARCHITECTURE)
    .map((n) => n.path)
    .join("\n");

  const treeNote =
    filteredNodes.length > MAX_TREE_FILES_ARCHITECTURE
      ? `\n(Showing ${MAX_TREE_FILES_ARCHITECTURE} of ${filteredNodes.length} source files)`
      : "";

  const readmeSection = meta.readme
    ? `## README\n\n${meta.readme}`
    : "(No README available)";

  const configSection = configFiles.length > 0
    ? `## Config Files\n\n${configFiles.map((f) => {
        const ext = f.path.split(".").pop() ?? "";
        return `### ${f.path}\n\`\`\`${extToLang(ext)}\n${f.content}\n\`\`\``;
      }).join("\n\n")}`
    : "";

  return `## Repository: ${meta.fullName}
Description: ${meta.description ?? "No description"}
Primary language: ${meta.language ?? "Unknown"}
Languages: ${Object.keys(meta.languages).join(", ") || "Unknown"}
Topics: ${meta.topics.join(", ") || "None"}
Stars: ${meta.stars}

${readmeSection}

${configSection}

## Directory Structure (source files only, tests/benchmarks/examples excluded)
\`\`\`
${treeListing}${treeNote}
\`\`\``;
}

/* ─── Feature Deep Dive (Phase 3) ─── */

export function buildFeatureDeepDivePrompt(): string {
  return `You are a technical writer creating documentation for ONE specific feature of a software project. You will be given the feature's name, description, and the full source code of its relevant files.

## Your task

Write comprehensive, developer-oriented documentation for this feature. A developer should be able to understand and USE this feature after reading your output, without needing to read the source code.

## Required content

Every feature MUST include:
1. **A clear explanation of what this feature does** from the user's perspective — what problem it solves, when you'd use it.
2. **Public interfaces and entry points** — the functions, classes, CLI commands, API endpoints, or configuration options that a user interacts with. Show their signatures and explain their parameters.
3. **How it works** — the flow from user action to result. Explain the mental model, not just the API surface.

## Writing guidelines

1. **Explain HOW things work, not just WHAT they are.** Don't just list functions — explain the patterns, the flow, the mental model. Instead of "this module handles errors", explain "errors are caught in the middleware chain and transformed into HTTP responses with status codes and JSON bodies".

2. **Write 2-5 sections.** Choose from: Overview, Public API / Entry Points, How It Works, Configuration, Usage Patterns, Integration Points. Always include an Overview section.

3. **Code snippets must be VERBATIM** from the provided source files. Copy exact code with accurate file paths and line numbers. Never fabricate or modify code. Prefer snippets that show public API surfaces — exports, function signatures, class definitions, configuration schemas.

4. **Citations must reference exact file paths and line numbers** from the provided files. Every section should have at least one citation linking back to the source code. Use empty arrays only if you truly have no relevant source.

5. **Write from the user's perspective.** If a file contains internal implementation, cite it but explain what user-facing behavior it enables.

6. **Cross-reference other features** by their IDs in \`relatedFeatures\` when relevant.

## Output

Return a JSON object with the feature's \`id\`, \`name\`, \`summary\` (1-2 sentences), \`sections\` array, and \`relatedFeatures\` array.`;
}

export function buildFeatureDeepDiveContext(
  meta: RepoMeta,
  tree: RepoTree,
  featurePlan: FeaturePlan,
  files: PreFetchedFile[],
  fullAnalysis: ArchitectureAnalysis,
): string {
  const readmeExcerpt = meta.readme
    ? meta.readme.slice(0, 2000)
    : "(No README available)";

  const otherFeatures = fullAnalysis.features
    .filter((f) => f.id !== featurePlan.id)
    .map((f) => `- **${f.name}** (\`${f.id}\`): ${f.description}`)
    .join("\n");

  const filesSections = files
    .map((f) => {
      const ext = f.path.split(".").pop() ?? "";
      const lang = extToLang(ext);
      return `### ${f.path}\n\`\`\`${lang}\n${f.content}\n\`\`\``;
    })
    .join("\n\n");

  const treeListing = tree.nodes
    .slice(0, MAX_TREE_FILES_WIKI)
    .map((n) => n.path)
    .join("\n");

  return `## Feature: ${featurePlan.name}
ID: ${featurePlan.id}
Description: ${featurePlan.description}

## Repository: ${meta.fullName}
Description: ${meta.description ?? "No description"}
Primary language: ${meta.language ?? "Unknown"}

## README (excerpt)
${readmeExcerpt}

## Other features in this wiki (for cross-references)
${otherFeatures}

## Directory Structure
\`\`\`
${treeListing}
\`\`\`

## Source Files

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
