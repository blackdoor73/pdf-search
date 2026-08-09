/**
 * Fire-and-forget email notification for new feedback, via Resend.
 *
 * No-ops unless RESEND_API_KEY and FEEDBACK_NOTIFY_EMAIL are both set. The
 * notify address is read from the server environment only — it is never
 * returned to the client, logged in responses, or embedded anywhere the
 * browser can see it. Failures are swallowed: a notify hiccup must never
 * fail the user's submission.
 */

import { FEEDBACK_CATEGORY_LABELS, type FeedbackCategory } from "./schema";
import { formatDiagnostics, type Diagnostics } from "./diagnostics";

export function notifyFeedback(row: {
  category: FeedbackCategory;
  message: string;
  email?: string | null;
  page?: string | null;
  country?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  /** Search context for "issue" reports — the whole point of those reports, so
   *  it is rendered inline rather than left for the admin UI. */
  diagnostics?: Diagnostics | null;
}): void {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.RESEND_FROM ?? "PDFSearch <onboarding@resend.dev>";
  const label = FEEDBACK_CATEGORY_LABELS[row.category] ?? row.category;
  const lines = [
    `Category: ${label}`,
    `From: ${row.email || "anonymous"}`,
    `Page: ${row.page || "—"}`,
    `Context: ${[row.device, row.os, row.browser].filter(Boolean).join(" · ") || "—"}${row.country ? ` · ${row.country}` : ""}`,
    "",
    row.message,
  ];

  if (row.diagnostics) {
    lines.push("", "─── search diagnostics ───", formatDiagnostics(row.diagnostics));
  }

  // Not awaited — this runs after the response is already committed.
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `PDFSearch feedback: ${label}`,
      text: lines.join("\n"),
      ...(row.email ? { reply_to: row.email } : {}),
    }),
  }).catch((err) => {
    console.error("[feedback notify] failed:", err);
  });
}
