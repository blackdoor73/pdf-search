/**
 * Roadmap types and display constants.
 *
 * Deliberately separate from queries.ts: the vote board is a client component,
 * and importing anything from queries.ts drags the Neon driver into the browser
 * bundle (it cost ~45 kB before this split). Nothing here may import a server
 * module.
 */

/** Board columns, in display order. */
export const FEATURE_STATUSES = ["considering", "planned", "building", "shipped"] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  considering: "Considering",
  planned: "Planned",
  building: "In progress",
  shipped: "Shipped",
};

export interface FeatureRequest {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  votes: number;
}

export function isFeatureStatus(v: string): v is FeatureStatus {
  return (FEATURE_STATUSES as readonly string[]).includes(v);
}
