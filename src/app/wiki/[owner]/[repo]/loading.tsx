"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, Loader2 } from "lucide-react";

const steps = [
  { label: "Fetching repository data...", delay: 0 },
  { label: "Exploring source code...", delay: 3000 },
  { label: "Generating documentation...", delay: 45000 },
];

function StepIcon({ state }: { state: "pending" | "active" | "done" }) {
  if (state === "done") {
    return <Check className="h-3.5 w-3.5 text-primary" />;
  }
  if (state === "active") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

export default function WikiLoading() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = steps.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-svh flex-col">
      {/* Header */}
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
        <span className="text-muted-foreground/40">/</span>
        <span className="font-mono text-xs text-muted-foreground">
          Generating...
        </span>
      </header>

      {/* Body */}
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

        {/* Main content — progress steps */}
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <h2 className="text-sm font-medium">Generating wiki</h2>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((step, i) => {
                const state =
                  i < activeStep ? "done" : i === activeStep ? "active" : "pending";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5"
                  >
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
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground/60">
              This usually takes 30–60 seconds
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
