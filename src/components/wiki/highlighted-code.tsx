"use client";

import { useEffect, useState } from "react";
import { getHighlighter, highlightCode } from "@/lib/shiki";

interface HighlightedCodeProps {
  code: string;
  language: string;
}

export function HighlightedCode({ code, language }: HighlightedCodeProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(highlightCode(highlighter, code, language));
    });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (!html) {
    return (
      <pre className="overflow-x-auto bg-muted/50 p-3 text-[13px] leading-5">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="overflow-x-auto text-[13px] leading-5 [&_pre]:bg-transparent [&_pre]:p-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
