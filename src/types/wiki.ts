export interface Citation {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  url: string;
}

export interface CodeSnippet {
  language: string;
  code: string;
  citation: Citation;
}

export interface Section {
  title: string;
  content: string;
  citations: Citation[];
  codeSnippets: CodeSnippet[];
}

export interface Feature {
  id: string;
  name: string;
  summary: string;
  sections: Section[];
  relatedFeatures: string[];
}

export interface Wiki {
  repoUrl: string;
  repoName: string;
  description: string;
  generatedAt: string;
  features: Feature[];
}
