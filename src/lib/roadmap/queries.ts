/**
 * Roadmap reads.
 *
 * Kept separate from the route handlers so /roadmap (a server component) and
 * any future admin view share one definition of "what the board looks like".
 * Every function tolerates an unconfigured database by returning empty data —
 * the page then renders its own empty state rather than a 500.
 */

import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";
import { type FeatureRequest, type FeatureStatus, isFeatureStatus } from "@/lib/roadmap/types";

export * from "@/lib/roadmap/types";

/**
 * Published features with their vote counts, ordered by votes desc.
 *
 * LEFT JOIN rather than a correlated subquery so a feature with no votes yet
 * still appears (with 0) — a brand-new item vanishing from the board until
 * someone votes would be the wrong behaviour.
 */
export async function getFeatureRequests(): Promise<FeatureRequest[]> {
  if (!isDbConfigured()) return [];
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT f.id, f.slug, f.title, f.description, f.status,
           COUNT(v.id)::int AS votes
    FROM feature_requests f
    LEFT JOIN feature_votes v ON v.feature_id = f.id
    WHERE f.published = true
    GROUP BY f.id
    ORDER BY f.sort_order ASC, votes DESC, f.created_at ASC
  `) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: r.description == null ? null : String(r.description),
    status: isFeatureStatus(String(r.status)) ? (String(r.status) as FeatureStatus) : "considering",
    votes: Number(r.votes ?? 0),
  }));
}

/** Feature ids this visitor has already voted for, so the UI can reflect it. */
export async function getVotedFeatureIds(anonId: string): Promise<number[]> {
  if (!isDbConfigured() || !anonId) return [];
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT feature_id FROM feature_votes WHERE anon_id = ${anonId}
  `) as Record<string, unknown>[];
  return rows.map((r) => Number(r.feature_id));
}
