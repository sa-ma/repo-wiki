export interface RepoMeta {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  readme: string | null;
  topics: string[];
}

export interface TreeNode {
  path: string;
  type: "blob" | "tree";
  size: number | null;
  sha: string;
}

export interface RepoTree {
  totalFiles: number;
  truncated: boolean;
  nodes: TreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  sha: string;
  truncated: boolean;
}

export type GitHubErrorCode =
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "FILE_TOO_LARGE"
  | "NETWORK_ERROR"
  | "UNKNOWN";
