import type { Wiki } from "./wiki";

export type PipelinePhase =
  | "connecting"
  | "fetching_metadata"
  | "picking_files"
  | "fetching_files"
  | "generating_wiki"
  | "complete"
  | "error";

export interface ProgressEvent {
  phase: PipelinePhase;
  message: string;
  /** 0–100, approximate */
  progress: number;
  detail?: string;
}

export interface CompleteEvent {
  phase: "complete";
  wiki: Wiki;
}

export interface ErrorEvent {
  phase: "error";
  code: string;
  message: string;
  retryAfter?: number;
}

export type SSEEvent = ProgressEvent | CompleteEvent | ErrorEvent;
