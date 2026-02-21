"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatPanelProps {
  owner: string;
  repo: string;
  activeFeatureId: string;
  onClose: () => void;
}

export function ChatPanel({
  owner,
  repo,
  activeFeatureId,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { owner, repo },
      }),
    [owner, repo]
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages (deferred to after paint)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isLoading = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text }, { body: { activeFeatureId } });
  }

  return (
    <div className="flex h-full flex-col border-l border-border/60 bg-sidebar">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">Ask about this repo</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Ask anything about this repository
              </p>
              <p className="text-xs text-muted-foreground/60">
                Answers are based on the generated wiki
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="flex-1">
              Something went wrong. Try sending your message again.
            </span>
            <Button variant="ghost" size="icon-xs" onClick={clearError}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border/60 p-3"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            aria-label="Ask a question about this repository"
            className="flex-1 rounded-md border border-border/60 bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({
  message,
}: {
  message: { id: string; role: string; parts?: Array<{ type: string; text?: string }> };
}) {
  const isUser = message.role === "user";
  const text =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-card text-foreground"
        }`}
      >
        {isUser ? (
          text
        ) : (
          <div className="chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary break-all underline underline-offset-2 hover:text-primary/80"
                  >
                    {children}
                  </a>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.startsWith("language-");
                  return isBlock ? (
                    <pre className="my-2 overflow-x-auto rounded-md bg-background p-2.5 text-xs">
                      <code>{children}</code>
                    </pre>
                  ) : (
                    <code className="rounded bg-background px-1 py-0.5 text-xs">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
