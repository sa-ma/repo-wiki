import { z } from "zod";

// Schema for OpenAI structured output — all fields required, no .default() or .optional().
// OpenAI strict mode rejects optional properties.

const citationModelSchema = z.object({
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
});

const codeSnippetModelSchema = z.object({
  language: z.string(),
  code: z.string(),
  citation: citationModelSchema,
});

const sectionModelSchema = z.object({
  title: z.string(),
  content: z.string(),
  citations: z.array(citationModelSchema),
  codeSnippets: z.array(codeSnippetModelSchema),
});

const featureModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  sections: z.array(sectionModelSchema),
  relatedFeatures: z.array(z.string()),
});

export const wikiModelSchema = z.object({
  description: z.string(),
  features: z.array(featureModelSchema),
});
