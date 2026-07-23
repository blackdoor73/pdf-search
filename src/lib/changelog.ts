/**
 * Product changelog — hand-maintained. Drives the /changelog page and the
 * "What's New" panel. Keep newest first; `latestEntryDate` is pure and
 * unit-tested.
 */

export type ChangelogTag = "new" | "improved" | "fixed";

export interface ChangelogEntry {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  tag: ChangelogTag;
  items: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-07-23",
    title: "Persona pages, guides, and in-app feedback",
    tag: "new",
    items: [
      "New guides for students, researchers, lawyers, finance, recruiters, engineers, government documents, and technical manuals.",
      "Send feedback from any page with the new feedback button — anonymous unless you add an email.",
      "A “What’s New” panel and this changelog so you can see what changed.",
      "Keyboard-shortcuts overlay — press ? anywhere to see them.",
    ],
  },
  {
    date: "2026-07-10",
    title: "Faster, more private search",
    tag: "improved",
    items: [
      "The PDF engine now loads its worker from PDFSearch itself instead of a third-party CDN — faster first search and a tighter privacy posture.",
      "Duplicate files (same contents under a different name) are now detected and skipped automatically.",
      "A 500 MB per-session limit prevents the browser from running out of memory on very large batches.",
    ],
  },
  {
    date: "2026-06-28",
    title: "Hardened URL fetching",
    tag: "fixed",
    items: [
      "Searching a PDF by URL now re-validates every redirect hop, closing an SSRF class of issue.",
      "Clearer error messages when a URL can’t be fetched or isn’t a PDF.",
    ],
  },
];

/** Most recent entry date (ISO). Returns "" for an empty changelog. */
export function latestEntryDate(entries: ChangelogEntry[]): string {
  return entries.reduce((max, e) => (e.date > max ? e.date : max), "");
}
