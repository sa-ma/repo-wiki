"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Github } from "lucide-react";

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\/+$/, "");

  // Full URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  // Shorthand: owner/repo
  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  return null;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError("Enter a valid GitHub repo URL or owner/repo shorthand");
      return;
    }
    setError("");
    router.push(`/wiki/${parsed.owner}/${parsed.repo}`);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <svg
              width="20"
              height="20"
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
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight">RepoWiki</h1>
            <p className="text-sm text-muted-foreground">
              Generate feature-driven docs for any public GitHub repo.
            </p>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Github className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="owner/repo"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError("");
                }}
                className="h-9 bg-secondary pl-9 text-sm placeholder:text-muted-foreground/60"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 px-4">
              Generate
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        {/* Example repos */}
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-xs text-muted-foreground/60">Try an example</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {["vercel/next.js", "facebook/react", "expressjs/express"].map(
              (repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => setUrl(repo)}
                  className="rounded-md border border-border/60 bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  {repo}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
