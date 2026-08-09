/**
 * Feedback submission schema — shared by the public API route and the
 * client widget. Pure module (no Next imports) so it's unit-testable.
 *
 * Note: no "Incorrect AI Response" category — the product has no AI.
 */

import { z } from "zod";
// Explicit .ts extension: this module is loaded directly by `node --test`
// (tests/feedbackSchema.test.ts), where Node's ESM resolver will not infer it.
import { diagnosticsSchema } from "./diagnostics.ts";

export const FEEDBACK_CATEGORIES = [
  "bug",
  /** Search-specific report carrying diagnostics — see ./diagnostics. */
  "issue",
  "feature",
  "general",
  "ui-ux",
  "performance",
  "other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug report",
  issue: "Search problem",
  feature: "Feature request",
  general: "General feedback",
  "ui-ux": "UI / UX suggestion",
  performance: "Performance issue",
  other: "Other",
};

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(MESSAGE_MIN).max(MESSAGE_MAX),
  /** Optional reply address — anonymous feedback is allowed. */
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  page: z.string().max(300).optional(),
  /** Honeypot — must be empty; bots fill it. Never persisted. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** Ms since the widget opened; humans take longer than a beat. */
  elapsedMs: z.number().int().nonnegative().optional(),
  /** Search context for "issue" reports. Never contains PDF bytes. */
  diagnostics: diagnosticsSchema.optional(),
  /** Anonymous cookie + per-tab session ids, for correlating with telemetry. */
  anonId: z.string().max(64).optional(),
  sessionId: z.string().max(64).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
