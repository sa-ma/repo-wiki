import { z } from "zod";

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

/* ─── Architecture Analysis (Phase 2) ─── */

export const architectureAnalysisSchema = z.object({
  description: z.string(),
  features: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    rationale: z.string(),
    filePaths: z.array(z.string()),
    relatedFeatureIds: z.array(z.string()),
  })),
});

export type ArchitectureAnalysis = z.infer<typeof architectureAnalysisSchema>;
export type FeaturePlan = ArchitectureAnalysis["features"][number];

/* ─── Per-Feature Deep Dive (Phase 3) ─── */

export const featureDeepDiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  sections: z.array(sectionModelSchema),
  relatedFeatures: z.array(z.string()),
});

export type FeatureDeepDive = z.infer<typeof featureDeepDiveSchema>;
