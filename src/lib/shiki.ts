import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const PRELOADED_LANGS = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "jsx",
  "tsx",
  "bash",
  "json",
  "yaml",
  "sql",
  "css",
  "html",
] as const;

const THEME = "github-dark-dimmed";

/** Normalize common language aliases to Shiki grammar names. */
const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  rb: "ruby",
  rs: "rust",
};

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: [...PRELOADED_LANGS],
    });
  }
  return highlighterPromise;
}

export function highlightCode(
  highlighter: Highlighter,
  code: string,
  language: string,
): string {
  const normalized = LANG_ALIASES[language] ?? language;
  const lang = highlighter.getLoadedLanguages().includes(normalized)
    ? normalized
    : "text";

  return highlighter.codeToHtml(code, { lang, theme: THEME });
}
