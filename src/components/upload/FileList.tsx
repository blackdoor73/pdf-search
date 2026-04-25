"use client";

import { useState } from "react";
import { FileText, Link, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { PdfFile } from "@/types";
import { formatBytes } from "@/hooks/useSearchEngine";

interface FileListProps {
  files: PdfFile[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  totalSizeBytes: number;
}

export function FileList({ files, onRemove, onClearAll, totalSizeBytes }: FileListProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (files.length === 0) return null;

  const fileCount = files.filter((f) => f.type === "file").length;
  const urlCount = files.filter((f) => f.type === "url").length;

  return (
    <div className="card animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface2)] border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setCollapsed((s) => !s)}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <span className="font-mono text-xs font-semibold text-[var(--text)]">
            {files.length} PDF{files.length > 1 ? "s" : ""} loaded
          </span>
          <div className="flex items-center gap-2">
            {fileCount > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[var(--border)] text-[var(--text-3)]">
                {fileCount} file{fileCount > 1 ? "s" : ""}
              </span>
            )}
            {urlCount > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[var(--border)] text-[var(--blue)]/80">
                {urlCount} URL{urlCount > 1 ? "s" : ""}
              </span>
            )}
            {totalSizeBytes > 0 && (
              <span className="font-mono text-[10px] text-[var(--text-3)]">
                {formatBytes(totalSizeBytes)}
              </span>
            )}
          </div>
          <span className="ml-auto text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          className="btn-danger ml-3 flex items-center gap-1.5 shrink-0"
          title="Remove all files"
        >
          <Trash2 className="w-3 h-3" />
          <span className="hidden sm:inline">Clear all</span>
        </button>
      </div>

      {/* File grid */}
      {!collapsed && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto">
          {files.map((file, i) => (
            <div
              key={file.id}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)]",
                "hover:border-[var(--border2)] transition-colors group animate-slide-in"
              )}
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              {file.type === "url" ? (
                <Link className="w-3 h-3 shrink-0 text-[var(--blue)]" />
              ) : (
                <FileText className="w-3 h-3 shrink-0 text-[var(--text-3)]" />
              )}
              <span
                className="font-mono text-xs text-[var(--text-2)] truncate flex-1 min-w-0"
                title={file.type === "url" ? (file.source as string) : file.name}
              >
                {file.name}
              </span>
              <span className="font-mono text-[10px] text-[var(--text-3)] shrink-0">
                {file.size}
              </span>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
