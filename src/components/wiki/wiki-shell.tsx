"use client";

import { useState } from "react";
import Link from "next/link";
import type { Wiki } from "@/types";
import { WikiSidebar } from "./wiki-sidebar";
import { WikiContent } from "./wiki-content";
import { ExternalLink, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WikiShell({ wiki }: { wiki: Wiki }) {
  const [activeFeatureId, setActiveFeatureId] = useState(
    wiki.features[0]?.id ?? ""
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeFeature = wiki.features.find((f) => f.id === activeFeatureId);

  return (
    <div className="flex h-svh flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Menu className="h-3.5 w-3.5" />
          )}
        </Button>
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
        <a
          href={wiki.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {wiki.repoName}
          <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-12 left-0 z-30 w-56 border-r border-border/60 bg-sidebar transition-transform md:static md:translate-x-0`}
        >
          <WikiSidebar
            features={wiki.features}
            activeFeatureId={activeFeatureId}
            onSelect={(id) => {
              setActiveFeatureId(id);
              setSidebarOpen(false);
            }}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {activeFeature ? (
            <WikiContent feature={activeFeature} repoUrl={wiki.repoUrl} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a feature to view.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
