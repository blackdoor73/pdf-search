import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely, resolving conflicts.
 * Use instead of clsx() for all component className props.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

/**
 * Derive a display filename from a URL path
 */
export function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop() ?? "document.pdf";
    return decodeURIComponent(name).replace(/[^a-zA-Z0-9._\- ]/g, "_");
  } catch {
    return "document.pdf";
  }
}

/**
 * Pluralize a word based on count
 */
export function plural(count: number, word: string, plural?: string): string {
  return count === 1 ? word : (plural ?? word + "s");
}

/**
 * Sleep for ms milliseconds (for testing/throttle)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
