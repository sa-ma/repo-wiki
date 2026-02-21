import type { Wiki } from "@/types";

/**
 * Converts a Wiki object into a markdown string for use as LLM chat context.
 */
export function serializeWikiToMarkdown(wiki: Wiki): string {
  const lines: string[] = [
    `# ${wiki.repoName}`,
    ``,
    wiki.description,
    ``,
    `Repository: ${wiki.repoUrl}`,
    ``,
    `---`,
    ``,
  ];

  for (const feature of wiki.features) {
    lines.push(`## ${feature.name}`);
    lines.push(``);
    lines.push(feature.summary);
    lines.push(``);

    for (const section of feature.sections) {
      lines.push(`### ${section.title}`);
      lines.push(``);
      lines.push(section.content);
      lines.push(``);

      for (const snippet of section.codeSnippets) {
        lines.push(`\`\`\`${snippet.language}`);
        lines.push(snippet.code);
        lines.push(`\`\`\``);
        lines.push(
          `*Source: [${snippet.citation.file}:${snippet.citation.startLine}-${snippet.citation.endLine}](${snippet.citation.url})*`
        );
        lines.push(``);
      }
    }

    if (feature.relatedFeatures.length > 0) {
      lines.push(
        `**Related features:** ${feature.relatedFeatures.join(", ")}`
      );
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  return lines.join("\n");
}
