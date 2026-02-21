"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WikiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-svh flex-col">
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
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">Something went wrong</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {error.message}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Home
              </Link>
            </Button>
            <Button size="sm" onClick={() => reset()}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
