"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--surface2)] border border-[var(--border)]",
        className
      )}
    />
  );
}

export function ResultCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface2)] border-b border-[var(--border)]">
        <Skeleton className="w-8 h-8 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-5 w-10 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-5 w-10 shrink-0" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function FileChipSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] animate-pulse">
      <Skeleton className="w-3 h-3 shrink-0 rounded-none" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-8 shrink-0" />
    </div>
  );
}
