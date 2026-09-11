/**
 * Seeds the /roadmap board with an initial set of features.
 *
 * Run manually once DATABASE_URL is set:
 *   node --env-file=.env.local scripts/seed-roadmap.mjs
 *
 * Deliberately NOT wired into prebuild — seeding on every deploy would
 * resurrect items you removed. Re-running is safe: rows are matched on slug
 * and updated in place, so vote counts survive (votes reference the row id,
 * which never changes).
 *
 * The board is admin-curated by design: users submit through the feedback
 * widget and you promote the recurring asks here. Everything below is drawn
 * from the existing product audit and roadmap docs — edit freely before the
 * first run.
 */

import { neon } from "@neondatabase/serverless";

const FEATURES = [
  {
    slug: "mobile-ocr",
    title: "OCR for scanned PDFs on mobile",
    description:
      "OCR currently runs on desktop only, because it is memory-hungry. Making it work on phones is the most requested gap.",
    status: "considering",
    sort_order: 10,
  },
  {
    slug: "saved-workspaces",
    title: "Save a set of PDFs and searches",
    description:
      "Name a collection of file URLs plus the queries you run against them, and reopen it later. Metadata only — never your file contents.",
    status: "considering",
    sort_order: 20,
  },
  {
    slug: "shareable-search-links",
    title: "Shareable search links",
    description:
      "Copy a link that reopens the same PDF URLs with your query pre-filled, so a colleague lands on the same result.",
    status: "considering",
    sort_order: 30,
  },
  {
    slug: "regex-search",
    title: "Regular-expression search",
    description:
      "Match patterns rather than literal text — invoice numbers, case citations, part codes.",
    status: "considering",
    sort_order: 40,
  },
  {
    slug: "folder-upload",
    title: "Drop a whole folder at once",
    description:
      "Select a directory instead of picking files one by one, keeping the folder structure in the results.",
    status: "considering",
    sort_order: 50,
  },
  {
    slug: "context-snippets",
    title: "Show surrounding context for each match",
    description:
      "Results show the matching line today. Optionally include the lines either side for more context.",
    status: "considering",
    sort_order: 60,
  },
  {
    slug: "japanese-korean-ocr",
    title: "Japanese and Korean OCR",
    description:
      "Ten languages ship today, including Hindi and Chinese. Japanese and Korean are the most likely additions.",
    status: "considering",
    sort_order: 70,
  },
  {
    slug: "pwa-offline",
    title: "Install as an app / work offline",
    description:
      "Since searching already runs in your browser, PDFSearch could work with no connection at all once installed.",
    status: "considering",
    sort_order: 80,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/seed-roadmap.mjs"
    );
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  // The app creates these on first request; create them here too so seeding
  // works against a fresh database before anyone has visited.
  await sql`
    CREATE TABLE IF NOT EXISTS feature_requests (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'considering',
      sort_order  INT NOT NULL DEFAULT 0,
      published   BOOLEAN NOT NULL DEFAULT true
    )
  `;

  for (const f of FEATURES) {
    await sql`
      INSERT INTO feature_requests (slug, title, description, status, sort_order, published)
      VALUES (${f.slug}, ${f.title}, ${f.description}, ${f.status}, ${f.sort_order}, true)
      ON CONFLICT (slug) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            sort_order = EXCLUDED.sort_order
    `;
    console.log(`  ✓ ${f.slug}`);
  }
  console.log(`\nSeeded ${FEATURES.length} features. Visit /roadmap to see the board.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
