"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Settings2, Clock } from "lucide-react";
import clsx from "clsx";
import type { SearchOptions, SearchHistoryEntry } from "@/types";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onCancel: () => void;
  isSearching: boolean;
  canSearch: boolean;
  options: SearchOptions;
  onOptionsChange: (opts: SearchOptions) => void;
  recentSearches?: SearchHistoryEntry[];
}

export function SearchBar({
  onSearch,
  onCancel,
  isSearching,
  canSearch,
  options,
  onOptionsChange,
  recentSearches = [],
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Keyboard-highlighted item in the history dropdown (-1 = none)
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  const filteredHistory = recentSearches
    .filter((s) => !query || s.query.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const closeHistory = () => {
    setShowHistory(false);
    setActiveIndex(-1);
  };

  // Close on click/tap outside. onBlur is unreliable here: iOS Safari does
  // not blur inputs when tapping non-focusable elements, which left the
  // dropdown stuck open on top of the page content.
  useEffect(() => {
    if (!showHistory) return;
    const onPointerDown = (e: PointerEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        closeHistory();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showHistory]);

  const handleSubmit = (q?: string) => {
    const value = (q ?? query).trim();
    if (!value || !canSearch) return;
    closeHistory();
    onSearch(value);
  };

  const handleHistorySelect = (q: string) => {
    setQuery(q);
    closeHistory();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (showHistory && activeIndex >= 0 && filteredHistory[activeIndex]) {
        e.preventDefault();
        handleHistorySelect(filteredHistory[activeIndex].query);
        return;
      }
      handleSubmit();
      return;
    }
    if (e.key === "Escape") {
      if (showHistory) closeHistory();
      else if (isSearching) onCancel();
      else setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      if (filteredHistory.length === 0) return;
      e.preventDefault();
      if (!showHistory) {
        setShowHistory(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((i) => (i + 1) % filteredHistory.length);
      }
      return;
    }
    if (e.key === "ArrowUp" && showHistory) {
      e.preventDefault();
      setActiveIndex((i) =>
        i <= 0 ? filteredHistory.length - 1 : i - 1
      );
      return;
    }
    if (e.key === "Tab" && showHistory) {
      closeHistory();
    }
  };

  return (
    <div className="space-y-2">
      {/* Main search row — comboRef wraps input + dropdown for outside-click detection */}
      <div className="relative" ref={comboRef}>
        <div
          className={clsx(
            "flex border transition-colors duration-150",
            isSearching
              ? "border-[var(--accent)]"
              : canSearch
              ? "border-[var(--border2)] focus-within:border-[var(--accent)]"
              : "border-[var(--border)] opacity-50"
          )}
        >
          {/* Search icon */}
          <div className="flex items-center pl-4 pr-3 shrink-0">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search
                className={clsx(
                  "w-4 h-4 transition-colors",
                  canSearch ? "text-[var(--text-3)]" : "text-[var(--border2)]"
                )}
              />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              if (e.target.value && recentSearches.length > 0) {
                setShowHistory(true);
              } else {
                setShowHistory(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (recentSearches.length > 0 && !query) setShowHistory(true);
            }}
            placeholder={
              canSearch
                ? "Enter name, number, or any text to search..."
                : "Load PDFs above to start searching"
            }
            disabled={!canSearch && !isSearching}
            className={clsx(
              "flex-1 bg-transparent py-4 pr-3 font-mono text-base text-[var(--text)] outline-none",
              "placeholder:text-[var(--text-3)]",
              (!canSearch && !isSearching) && "cursor-not-allowed"
            )}
            aria-label="Search query"
            autoComplete="off"
            role="combobox"
            aria-expanded={showHistory && filteredHistory.length > 0}
            aria-controls="search-history-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `search-history-option-${activeIndex}` : undefined
            }
          />

          {/* Clear button */}
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                closeHistory();
                inputRef.current?.focus();
              }}
              className="px-3 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Options toggle */}
          <button
            type="button"
            onClick={() => {
              closeHistory();
              setShowOptions((s) => !s);
            }}
            className={clsx(
              "px-3 border-l border-[var(--border)] transition-colors",
              showOptions
                ? "text-[var(--accent)]"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            )}
            title="Search options"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Search / Cancel button */}
          <button
            type="button"
            onClick={isSearching ? onCancel : () => handleSubmit()}
            disabled={!isSearching && (!canSearch || !query.trim())}
            className={clsx(
              "shrink-0 px-6 font-mono text-sm font-semibold tracking-wide transition-colors border-l border-[var(--border)]",
              isSearching
                ? "text-[var(--red)] hover:bg-red-500/10"
                : "text-[var(--accent)] hover:bg-yellow-500/10",
              (!isSearching && (!canSearch || !query.trim())) &&
                "opacity-30 cursor-not-allowed"
            )}
          >
            {isSearching ? "Cancel" : "Search"}
          </button>
        </div>

        {/* History dropdown — z-50 keeps it above sibling sections whose
            entry animations (opacity < 1) create their own stacking contexts */}
        {showHistory && filteredHistory.length > 0 && (
          <div
            id="search-history-listbox"
            role="listbox"
            aria-label="Recent searches"
            className="absolute top-full left-0 right-0 z-50 bg-[var(--surface2)] border border-[var(--border2)] shadow-xl max-h-72 overflow-y-auto"
          >
            <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-1.5 sticky top-0 bg-[var(--surface2)]">
              <Clock className="w-3 h-3 text-[var(--text-3)]" />
              <span className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-widest">
                Recent searches
              </span>
            </div>
            {filteredHistory.map((entry, i) => (
              <button
                key={entry.query}
                id={`search-history-option-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleHistorySelect(entry.query)}
                onMouseEnter={() => setActiveIndex(i)}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-2.5 transition-colors group",
                  i === activeIndex ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"
                )}
              >
                <span className="font-mono text-sm text-[var(--text-2)] group-hover:text-[var(--text)] truncate text-left">
                  {entry.query}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-3)] shrink-0 ml-4">
                  {entry.matchCount > 0
                    ? `${entry.matchCount} match${entry.matchCount > 1 ? "es" : ""}`
                    : "no matches"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options panel */}
      {showOptions && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] animate-slide-in">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={options.caseSensitive}
              onChange={(e) =>
                onOptionsChange({ ...options, caseSensitive: e.target.checked })
              }
              className="accent-[var(--accent)] w-3.5 h-3.5"
            />
            <span className="font-mono text-xs text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
              Case sensitive
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={options.wholeWord}
              onChange={(e) =>
                onOptionsChange({ ...options, wholeWord: e.target.checked })
              }
              className="accent-[var(--accent)] w-3.5 h-3.5"
            />
            <span className="font-mono text-xs text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
              Whole word only
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={options.showContext}
              onChange={(e) =>
                onOptionsChange({ ...options, showContext: e.target.checked })
              }
              className="accent-[var(--accent)] w-3.5 h-3.5"
            />
            <span className="font-mono text-xs text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
              Show surrounding context
            </span>
          </label>
        </div>
      )}

      {/* Keyboard hint */}
      {canSearch && !isSearching && (
        <p className="font-mono text-[10px] text-[var(--text-3)] pl-1">
          Press{" "}
          <kbd className="px-1.5 py-0.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-3)]">
            Enter
          </kbd>{" "}
          to search ·{" "}
          <kbd className="px-1.5 py-0.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--text-3)]">
            Esc
          </kbd>{" "}
          to clear
        </p>
      )}
    </div>
  );
}
