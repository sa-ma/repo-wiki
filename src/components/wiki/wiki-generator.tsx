"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { Wiki, PipelinePhase } from "@/types";
import { WikiShell } from "./wiki-shell";
import {
  Check,
  Circle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WikiGeneratorProps {
  owner: string;
  repo: string;
}

const STEPS: { phase: PipelinePhase; label: string }[] = [
  { phase: "fetching_metadata", label: "Fetching repository data..." },
  { phase: "picking_files", label: "Analyzing source code..." },
  { phase: "fetching_files", label: "Reading key source files..." },
  { phase: "generating_wiki", label: "Generating documentation..." },
];

type GeneratorState =
  | { status: "loading"; phase: PipelinePhase; progress: number; detail?: string }
  | { status: "complete"; wiki: Wiki }
  | { status: "error"; code: string; message: string; retryAfter?: number };

export function WikiGenerator({ owner, repo }: WikiGeneratorProps) {
  const [state, setState] = useState<GeneratorState>({
    status: "loading",
    phase: "connecting",
    progress: 0,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    eventSourceRef.current?.close();
    setState({ status: "loading", phase: "connecting", progress: 0 });

    const es = new EventSource(`/api/wiki/${owner}/${repo}`);
    eventSourceRef.current = es;

    es.addEventListener("progress", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState({
        status: "loading",
        phase: data.phase,
        progress: data.progress,
        detail: data.detail,
      });
    });

    es.addEventListener("complete", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setState({ status: "complete", wiki: data.wiki });
      es.close();
    });

    es.addEventListener("error", (e: Event) => {
      if (e instanceof MessageEvent && e.data) {
        const data = JSON.parse(e.data);
        setState({
          status: "error",
          code: data.code,
          message: data.message,
          retryAfter: data.retryAfter,
        });
      } else {
        setState({
          status: "error",
          code: "CONNECTION_ERROR",
          message: "Lost connection to the server. Please try again.",
        });
      }
      es.close();
    });
  }, [owner, repo]);

  useEffect(() => {
    connect();
    return () => eventSourceRef.current?.close();
  }, [connect]);

  if (state.status === "complete") {
    return <WikiShell wiki={state.wiki} />;
  }

  if (state.status === "error") {
    return (
      <ErrorView
        code={state.code}
        message={state.message}
        retryAfter={state.retryAfter}
        onRetry={connect}
      />
    );
  }

  return (
    <ProgressView
      phase={state.phase}
      progress={state.progress}
      detail={state.detail}
    />
  );
}

/* ─── Header (shared by progress + error views) ─── */

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 px-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          className="text-primary"
        >
          <path
            d="M3 4h14M3 8h10M3 12h12M3 16h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        RepoWiki
      </Link>
      {subtitle && (
        <>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-mono text-xs text-muted-foreground">
            {subtitle}
          </span>
        </>
      )}
    </header>
  );
}

/* ─── Step icon ─── */

function StepIcon({ state }: { state: "pending" | "active" | "done" }) {
  if (state === "done") {
    return <Check className="h-3.5 w-3.5 text-primary" />;
  }
  if (state === "active") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

/* ─── Progress view ─── */

function ProgressView({
  phase,
  progress,
  detail,
}: {
  phase: PipelinePhase;
  progress: number;
  detail?: string;
}) {
  const activeIndex = STEPS.findIndex((s) => s.phase === phase);

  return (
    <div className="flex h-svh flex-col">
      <Header subtitle="Generating..." />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="hidden w-56 border-r border-border/60 bg-sidebar p-3 md:block">
          <div className="flex flex-col gap-2">
            {[72, 56, 88, 64, 48, 80].map((width, i) => (
              <div
                key={i}
                className="h-7 animate-pulse rounded-md bg-muted/60"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <h2 className="text-sm font-medium">Generating wiki</h2>
            </div>

            {/* Progress bar */}
            <div className="w-64">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-3">
              {STEPS.map((step, i) => {
                const state =
                  i < activeIndex
                    ? "done"
                    : i === activeIndex
                      ? "active"
                      : "pending";
                return (
                  <div key={step.phase} className="flex items-center gap-2.5">
                    <StepIcon state={state} />
                    <span
                      className={`text-sm ${
                        state === "pending"
                          ? "text-muted-foreground/40"
                          : state === "active"
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {state === "active" && detail && (
                      <span className="text-xs text-muted-foreground/50">
                        ({detail})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground/60">
              This usually takes 60–90 seconds
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Error view ─── */

function ErrorView({
  code,
  message,
  retryAfter,
  onRetry,
}: {
  code: string;
  message: string;
  retryAfter?: number;
  onRetry: () => void;
}) {
  const [countdown, setCountdown] = useState(retryAfter ?? 0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const isRateLimited = code === "RATE_LIMITED" && countdown > 0;

  const icon =
    code === "RATE_LIMITED" ? (
      <Clock className="h-8 w-8 text-muted-foreground" />
    ) : (
      <AlertCircle className="h-8 w-8 text-destructive" />
    );

  const title =
    code === "NOT_FOUND"
      ? "Repository not found"
      : code === "RATE_LIMITED"
        ? "Rate limit exceeded"
        : "Failed to generate wiki";

  return (
    <div className="flex h-svh flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          {icon}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Link>
            </Button>
            {isRateLimited ? (
              <Button size="sm" disabled>
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Retry in {formatCountdown(countdown)}
              </Button>
            ) : (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
