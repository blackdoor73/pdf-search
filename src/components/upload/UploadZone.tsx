"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFiles: (files: File[]) => Promise<{ added: number; skipped: string[] }>;
  disabled?: boolean;
}

export function UploadZone({ onFiles, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const pdfs = files.filter(
        (f) =>
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );
      if (pdfs.length === 0) return;
      setIsProcessing(true);
      try {
        await onFiles(pdfs);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      processFiles(Array.from(e.dataTransfer.files));
    },
    [disabled, processFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      processFiles(files);
      e.target.value = "";
    },
    [processFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && !isProcessing && inputRef.current?.click()}
      className={cn(
        "relative border border-dashed p-10 text-center cursor-pointer",
        "transition-all duration-200 select-none",
        isDragging
          ? "border-[var(--accent)] bg-yellow-500/5"
          : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--accent)]/50 hover:bg-yellow-500/[0.02]",
        (disabled || isProcessing) &&
          "opacity-40 cursor-not-allowed pointer-events-none"
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) inputRef.current?.click();
        }
      }}
      aria-label="Upload PDF files"
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div
          className={cn(
            "w-12 h-12 flex items-center justify-center border transition-colors",
            isDragging
              ? "border-[var(--accent)] bg-yellow-500/10"
              : "border-[var(--border2)] bg-[var(--surface2)]"
          )}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : isDragging ? (
            <FileText className="w-5 h-5 text-[var(--accent)]" />
          ) : (
            <Upload className="w-5 h-5 text-[var(--text-3)]" />
          )}
        </div>

        <div>
          <p className="font-mono text-sm font-medium text-[var(--text)]">
            {isDragging ? "Drop PDFs here" : "Drop PDF files here"}
          </p>
          <p className="font-mono text-xs text-[var(--text-3)] mt-1">
            or{" "}
            <span className="text-[var(--accent)]">click to browse</span>
            {" · "}Multiple files supported{" · "}Max 50MB each
          </p>
        </div>
      </div>
    </div>
  );
}
