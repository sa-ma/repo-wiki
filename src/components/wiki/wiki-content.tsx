import type { ReactNode } from "react";
import type { Feature, Citation, CodeSnippet } from "@/types";
import { ExternalLink } from "lucide-react";

interface WikiContentProps {
  feature: Feature;
  repoUrl: string;
}

export function WikiContent({ feature, repoUrl }: WikiContentProps) {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold tracking-tight">{feature.name}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {feature.summary}
      </p>

      {/* Table of contents */}
      {feature.sections.length > 1 && (
        <nav className="mt-6 rounded-lg border border-border/60 bg-card p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
            On this page
          </p>
          <ul className="space-y-0.5">
            {feature.sections.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${slugify(section.title)}`}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Sections */}
      <div className="mt-8 space-y-10">
        {feature.sections.map((section) => (
          <section key={section.title} id={slugify(section.title)}>
            <h2 className="text-sm font-medium">{section.title}</h2>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {renderContentWithCitations(section.content, section.citations)}
            </div>

            {/* Code snippets */}
            {section.codeSnippets.map((snippet) => (
              <CodeBlock
                key={snippet.citation.id}
                snippet={snippet}
                repoUrl={repoUrl}
              />
            ))}
          </section>
        ))}
      </div>

      {/* Related features */}
      {feature.relatedFeatures.length > 0 && (
        <div className="mt-10 border-t border-border/60 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">
            Related
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {feature.relatedFeatures.map((id) => (
              <span
                key={id}
                className="rounded border border-border/60 bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function CodeBlock({
  snippet,
}: {
  snippet: CodeSnippet;
  repoUrl: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between border-b border-border/40 bg-card px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground/70">
          {snippet.citation.file}:{snippet.citation.startLine}-
          {snippet.citation.endLine}
        </span>
        <a
          href={snippet.citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          Source
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
      <pre className="overflow-x-auto bg-muted/50 p-3 text-[13px] leading-5">
        <code>{snippet.code}</code>
      </pre>
    </div>
  );
}

function renderContentWithCitations(text: string, citations: Citation[]) {
  const parts: (string | ReactNode)[] = [];
  let remaining = text;
  let key = 0;

  for (const citation of citations) {
    const label = `${citation.file}:${citation.startLine}-${citation.endLine}`;
    const bracketLabel = `[${label}]`;
    const idx = remaining.indexOf(bracketLabel);

    if (idx !== -1) {
      parts.push(remaining.slice(0, idx));
      parts.push(
        <a
          key={key++}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/20"
        >
          {citation.file}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      );
      remaining = remaining.slice(idx + bracketLabel.length);
    }
  }

  parts.push(remaining);
  return parts;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}
