import type { Wiki } from "./wiki";
import type { Feature } from "./wiki";

export type PipelinePhase =
  | "connecting"
  | "fetching_metadata"
  | "analyzing_architecture"
  | "generating_features"
  | "assembling"
  | "complete"
  | "error";

export interface ProgressEvent {
  phase: PipelinePhase;
  message: string;
  /** 0-100, approximate */
  progress: number;
  detail?: string;
  featuresTotal?: number;
  featuresComplete?: number;
}

export interface FeatureCompleteEvent {
  phase: "feature_complete";
  feature: Feature;
  featureIndex: number;
  featuresTotal: number;
  featuresComplete: number;
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

export type SSEEvent = ProgressEvent | FeatureCompleteEvent | CompleteEvent | ErrorEvent;
