"use client";

import { useState, useRef, useCallback } from "react";
import {
  Link,
  HelpCircle,
  Plus,
  List,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/types";

interface UrlInputProps {
  onAddUrls: (urls: string[]) => Promise<{ added: number; skipped: string[] }>;
  recentUrls?: HistoryEntry[];
  disabled?: boolean;
}

const TOOLTIP_CONTENT = (
  <div className="space-y-3">
    <div>
      <p className="text-[var(--text)] font-medium mb-1">What is a PDF URL?</p>
      <p className="text-[var(--text-2)]">
        A direct web link to a PDF file hosted online.
      </p>
    </div>
    <div>
      <p className="text-[var(--text)] font-medium mb-1">When to use</p>
      <ul className="text-[var(--text-2)] space-y-0.5">
        <li>· Government or institutional document portals</li>
        <li>· Archives with many PDFs (voter rolls, reports)</li>
        <li>· Any PDF you can open directly in a browser</li>
      </ul>
    </div>
    <div>
      <p className="text-[var(--text)] font-medium mb-1">Accepted formats</p>
      <code className="text-[var(--accent)] text-[10px]">
        https://example.gov/document.pdf
      </code>
    </div>
    <div className="pt-1 border-t border-[var(--border)]">
      <p className="text-[var(--text-3)]">
        HTTPS only · Fetched securely via server proxy · Never stored
      </p>
    </div>
  </div>
);

export function UrlInput({
  onAddUrls,
  recentUrls = [],
  disabled,
}: UrlInputProps) {
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTooltip = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setShowTooltip(true);
  }, []);

  const closeTooltip = useCallback(() => {
    tooltipTimer.current = setTimeout(() => setShowTooltip(false), 150);
  }, []);

  const handleAddSingle = useCallback(async () => {
    const url = singleUrl.trim();
    if (!url || isLoading) return;
    setIsLoading(true);
    try {
      await onAddUrls([url]);
      setSingleUrl("");
    } finally {
      setIsLoading(false);
    }
  }, [singleUrl, isLoading, onAddUrls]);

  const handleAddBulk = useCallback(async () => {
    const urls = bulkText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0 || isLoading) return;
    setIsLoading(true);
    try {
      await onAddUrls(urls);
      setBulkText("");
      setShowBulk(false);
    } finally {
      setIsLoading(false);
    }
  }, [bulkText, isLoading, onAddUrls]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAddSingle();
    },
    [handleAddSingle]
  );

  const handleHistorySelect = useCallback(
    async (entry: HistoryEntry) => {
      if (!entry.url) return;
      setShowHistory(false);
      setIsLoading(true);
      try {
        await onAddUrls([entry.url]);
      } finally {
        setIsLoading(false);
      }
    },
    [onAddUrls]
  );

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-[var(--text-3)] uppercase tracking-widest">
          Or add by URL
        </span>

        {/* Help tooltip trigger */}
        <div className="relative">
          <button
            type="button"
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
            onFocus={openTooltip}
            onBlur={closeTooltip}
            className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
            aria-label="Learn about PDF URLs"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showTooltip && (
            <div
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
              className="absolute left-5 top-0 z-50 w-72 bg-[var(--surface2)] border border-[var(--border2)] p-4 shadow-2xl animate-slide-in font-mono text-[11px] leading-relaxed"
            >
              {TOOLTIP_CONTENT}
            </div>
          )}
        </div>

        {/* Recent URLs toggle */}
        {recentUrls.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="ml-auto flex items-center gap-1 font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors uppercase tracking-widest"
          >
            <Clock className="w-3 h-3" />
            Recent ({recentUrls.length})
            {showHistory ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Recent URLs dropdown */}
      {showHistory && recentUrls.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] max-h-44 overflow-y-auto animate-slide-in">
          <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
            <span className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-widest">
              Previously added
            </span>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-[var(--text-3)] hover:text-[var(--text-2)]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {recentUrls.slice(0, 15).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleHistorySelect(entry)}
              disabled={disabled || isLoading}
              className="w-full text-left px-3 py-2.5 font-mono text-xs text-[var(--text-2)] hover:bg-[var(--surface2)] hover:text-[var(--accent)] transition-colors flex items-center gap-2 disabled:opacity-40"
            >
              <Link className="w-3 h-3 shrink-0 text-[var(--blue)]" />
              <span className="truncate">{entry.url}</span>
            </button>
          ))}
        </div>
      )}

      {/* Single URL row */}
      <div className="flex">
        {/* Icon prefix */}
        <div className="flex items-center px-3 bg-[var(--surface)] border border-r-0 border-[var(--border)] shrink-0">
          <Link className="w-3.5 h-3.5 text-[var(--text-3)]" />
        </div>

        {/* Input */}
        <input
          type="url"
          value={singleUrl}
          onChange={(e) => setSingleUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.gov/document.pdf"
          disabled={disabled || isLoading}
          className={cn(
            "input-base flex-1 border-l-0 text-xs min-w-0",
            (disabled || isLoading) && "opacity-40 cursor-not-allowed"
          )}
          aria-label="PDF URL"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {/* Add single */}
        <button
          type="button"
          onClick={handleAddSingle}
          disabled={!singleUrl.trim() || disabled || isLoading}
          className="btn-ghost border-l-0 px-3 py-2 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Add URL"
        >
          {isLoading ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline text-xs">Add</span>
        </button>

        {/* Bulk toggle */}
        <button
          type="button"
          onClick={() => setShowBulk((s) => !s)}
          disabled={disabled}
          className={cn(
            "btn-ghost border-l-0 px-3 py-2 shrink-0 disabled:opacity-30",
            showBulk && "text-[var(--accent)] border-[var(--accent)]/30"
          )}
          title="Paste multiple URLs"
        >
          <List className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Bulk</span>
        </button>
      </div>

      {/* Bulk textarea */}
      {showBulk && (
        <div className="space-y-2 animate-slide-in">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={
              "Paste multiple PDF URLs, one per line:\nhttps://example.com/doc1.pdf\nhttps://example.com/doc2.pdf"
            }
            rows={4}
            disabled={disabled || isLoading}
            className="input-base w-full resize-y text-xs leading-relaxed min-h-[88px]"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddBulk}
              disabled={!bulkText.trim() || disabled || isLoading}
              className="btn-primary py-1.5 text-xs disabled:opacity-40"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Add all URLs
            </button>
            <span className="font-mono text-[10px] text-[var(--text-3)]">
              {bulkText.split("\n").filter((l) => l.trim()).length} URL
              {bulkText.split("\n").filter((l) => l.trim()).length !== 1
                ? "s"
                : ""}{" "}
              detected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
