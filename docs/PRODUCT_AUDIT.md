# PDFSearch — Product, UX, Growth & Engineering Audit
*Consolidated review · July 2026*

Companion documents: [ANALYTICS_AUDIT.md](ANALYTICS_AUDIT.md), [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md).

---

## 1. Product critique

**What it is.** Search across many PDFs simultaneously — 100% in the browser via pdf.js. No account, no upload, no storage, no server processing. 200 files / 50 MB each per session.

**Who it's for.** Three archetypes with real pain: **researchers/academics** (literature review across dozens of papers), **legal/compliance** (contract review, discovery), and **civic/journalism/data curators** (public-record dumps — Indian voter rolls, government reports, filings). Also students, business analysts.

**Actual problem.** Ctrl+F only searches the currently open PDF. Adobe Acrobat and desktop tools (DocFetcher, Foxit) can search folders but require install, indexing, and (often) money. Cloud tools require upload — hard sell for legal or sensitive documents.

**Do users care?** Yes — evidenced by GSC opportunity queries around "search multiple PDFs", "PDF search engine", and the audience-specific long-tails already targeted by landing pages.

**Why choose this over alternatives?** Instant, free, no signup, no upload, works on any device with a modern browser. The privacy story is not marketing — it's technically true (verifiable via network tab).

**Biggest weakness.** The value proposition is **invisible above the fold**. Desktop first paint: hero + badges + partial upload zone. Mobile: 100% marketing text before you can act. For a product whose promise is "instant," reading is the first user experience. See §2.

**Where users abandon.** Instrumented funnel (Overview page): `visit → upload → search → success → export`. Expect leaks at visit→upload (fold problem) and search→success (zero-result queries where they wanted OCR/fuzzy). Numbers are live in `/admin` once traffic accrues past the pre-fix bot pollution.

**5-second value-prop test.** Currently: fails on desktop, badly fails on mobile. Fix: compress hero + unify workspace card so `01 · ADD PDFS` and `02 · SEARCH` share the first viewport. Detailed wireframes in §2.

---

## 2. UX audit (condensed)

Full component-level review with wireframes was delivered inline earlier this session — this is the priority summary. Some fixes shipped in prior PRs (search-history dropdown stacking-context fix in #2, post-upload focus handoff in #5).

| # | Severity | Problem | Recommendation |
|---|---|---|---|
| P0 | Critical | Tool below fold on desktop; 2–3 screens deep on mobile | Compress hero (same copy for SEO), unify workspace card |
| P0 | Critical | "Drop anywhere" toast + ⌘K shortcut both false in empty state; stray drops navigate away and lose session | Window-level drop overlay + `preventDefault`; ⌘K works always (never disable search input) |
| P1 | High | Accent yellow spent on Quick Load badge, not primary action | Filled `Choose PDF files` button in zone; Quick Load restyled to ghost, collapsed under URL toggle |
| P1 | High | Three load methods presented at once (Hick's Law) | Progressive disclosure: drop zone visible; "Add by URL ▸" collapses URL + Bulk + Quick Load |
| P1 | High | Mobile prompt says "Drop PDF files" — drag doesn't exist on touch | Large tap CTA; hide drop copy on `@media (hover:none)` |
| P1 | High | FileList remove ✕ is `opacity-0 group-hover` — untouchable on mobile | Always visible on touch, ≥44px |
| P2 | Medium | Post-upload silence (partially fixed in #5); FileList insertion causes layout shift | Chips inside workspace; no push-down |
| P2 | Medium | Search options behind unlabeled gear; active state invisible | Labeled inline chips (`Aa`, `\|ab\|`) with active state |
| P2 | Medium | `--text-3` ≈ 3.9:1 on `--bg` — fails WCAG AA for 10px text | New `--text-instructional` at ≥4.6:1 |
| P3 | Low | Zero-result state tells users to change options manually | Buttons: "Retry without whole-word", "Retry case-insensitive" |
| P3 | Low | 200-file results render every match node | Virtualize past ~200 matches |

**First-time user in <30 seconds?** Not today. With workspace compression + queued-search coach mark (accept typing pre-upload, auto-run on load) + auto-focus handoff (shipped) → yes.

---

## 3. Growth strategy — 0 to 1M users (hybrid direction)

Direction confirmed: keep the anonymous privacy-first core; layer an **optional accounts tier** later that stores metadata/URLs only, never file content.

### SEO — the highest-leverage lever (already partially built)

- **Programmatic landing pages exist** (`/search-multiple-pdfs`, `/find-words-in-pdf`, etc. — 8 pages sharing `LandingPageShell`). Extend the pattern:
  - `pdfsearch.info/search-<use-case>-pdfs` — for `voter-roll`, `contract`, `research-paper`, `annual-report`, `court-filing`, `medical-record`, `patent`, `academic-thesis`, `government-notification`, `income-tax-return`, `sec-filing`, `pdf-form`. Each solves a specific real query.
  - `pdfsearch.info/vs/<competitor>` — comparison pages targeting bottom-funnel intent (`vs/adobe-acrobat`, `vs/foxit`, `vs/docfetcher`, `vs/ctrl-f`). Explicit privacy framing wins here.
  - `pdfsearch.info/how-to/<task>` — extend `how-to-search-pdf` with `how-to-search-scanned-pdf`, `how-to-search-multiple-pdfs-at-once`, `how-to-find-a-word-in-pdf`, `how-to-search-pdf-on-mac/windows/iphone/android`.
- **GSC-driven optimization loop.** The admin Insights page already flags queries at positions 4–20 (page 1–2, high leverage). Weekly cadence: pick top 3 opportunities → rewrite title/H1 and expand H2 sections → track position shift. This is a compounding growth loop.
- **Blog cadence.** One high-effort post per week around a specific search query type. Examples: *"Full-text search across your voter roll PDFs in 30 seconds"*, *"Reviewing 50 contracts without opening them: a PDF search workflow"*.
- **JSON-LD schema** (present) — extend with `HowTo` schema on each landing page (already on homepage), `AggregateRating` (present), `FAQPage` (present); add `SoftwareSourceCode` if repo goes public.

### Product-Hunt / Hacker News / Reddit launch playbook

- **HN angle:** "Show HN: I built a PDF search engine where files never leave your browser." Front-load the technical hook (pdf.js + WebWorker + no backend). Post Tuesday 8am ET.
- **PH angle:** Same but consumer-framed. Video demo showing 50 PDFs → answer in 3 seconds. Hunter should be someone with active audience in privacy/productivity.
- **Reddit fits (in order of expected fit):** r/productivity, r/DataHoarder, r/dataisbeautiful, r/india (for voter-roll use case), r/paperlessng, r/researchpapers, r/law, r/legaltech. Never spam — one high-effort post per subreddit with a genuine use case.
- **IndieHackers:** Build-in-public thread with real metrics (once analytics has data).

### Viral loops (constrained by privacy promise)

**Anonymous-tier loops that work today with zero backend:**

- **Shareable *tool* deep links.** Encode `?url=<pdf-url>&q=<query>` in the URL. Anyone opening it lands in a pre-filled search-ready workspace. This already partially exists in the SearchAction schema. Wire it end-to-end: parse `?q`/`?url` on load, prefill the input + auto-add the URL, coach mark "Someone shared this search with you." One person doing one search on a public voter roll = a link they naturally text to a friend.
- **"Copy as link" on results.** Alongside CSV export, "Copy shareable link" that encodes the URL + query. Zero storage; the shared search re-runs client-side.
- **Browser extension** (Chrome/Firefox/Edge). Right-click a PDF link → "Search this with PDFSearch." Top-of-funnel distribution that Google rewards with review count.
- **Bookmarklet.** Same idea, zero-install: drag to bookmarks bar → click on any page with PDFs → parses page for `.pdf` links and opens PDFSearch with them prefilled.

**Optional-tier loops (hybrid direction — later):**

- **Saved workspaces / collections.** Signed-in users can save a *URL list + queries* as a named collection. Never the file bytes. Share a collection link → recipient re-fetches URLs and runs saved queries locally.
- **Referral incentive.** Anonymous tier is already free forever; incentives should unlock optional-tier features (bigger session, cross-device sync of workspace metadata, priority support), not core function.

### Free tools (SEO magnets + top-of-funnel)

Small standalone tools on the same domain, each ranking for its own query set:

- `/tools/pdf-page-counter` — client-side pdf.js, no upload.
- `/tools/pdf-text-extractor` — same.
- `/tools/pdf-metadata-viewer`.
- `/tools/merge-pdfs`, `/tools/split-pdf`, `/tools/compress-pdf` — all client-side via pdf-lib/pdf.js.

Each tool cross-links to the search product ("Extract text? You can *search* across dozens at once →").

### Content strategy summary

- **YouTube:** long-form workflow videos (research paper review, contract review) with the tool. Screencasts with narration rank for how-to queries.
- **Twitter/LinkedIn:** Short before/after threads. "50 contracts, one search, 30 seconds. Zero uploads." Screenshot + link.
- **Communities to seed:** Notion/Obsidian/Zotero user groups (they store PDFs), academic Discord servers.

---

## 4. Retention

The anonymous nature means "come back" must be triggered by product utility, not notifications (no email). Levers:

- **Recent files & searches** (cookie-persisted today; URL history under-surfaced on the homepage). Immediately surface both on return visits — "Continue with your recent PDFs?"
- **Bookmarkable searches** via the shareable deep links above.
- **Optional accounts (hybrid tier):** weekly digest of "your saved workspaces have new matches" — because URL-based sources (voter rolls, filings) update. This is a *legitimately new value prop* nobody else offers.
- **PWA install.** Add manifest + service worker; installable icon means one tap, offline capability, and OS presence — real retention lever.

---

## 5. Conversion optimization

Instrumented funnel (already live): `session_start → pdf_upload → search → search (matches>0) → export_csv`. A/B candidates:

| Experiment | Hypothesis | Metric |
|---|---|---|
| Compressed hero + unified workspace | Fold problem hurts visit→upload | Upload conversion rate |
| In-zone filled CTA vs current subtle zone | Weak affordance hurts click-through | Upload conversion rate |
| Sample-PDF link *inside* empty zone | Higher discovery at moment of need | Sample-PDF click-through |
| Accept typing pre-upload with queued search | Removes dead-end for search-first users | Search rate per session |
| Auto-focus search after first file (shipped in #5) | Reduces post-upload silence | search / session |
| ⌘K works always (currently no-ops when disabled) | Advertised shortcut should function | ⌘K usage |

---

## 6. Performance

**Public bundle (from build):**
- Homepage: **145 kB first-load JS** — good for a Next.js app with dynamic imports.
- Landing pages: 106 kB — excellent.
- Admin dashboard: 230 kB — carries recharts; isolated behind auth, invisible to public users. ✓
- pdf.js: dynamically imported, worker on CDN. ✓ (documented risk: third-party CDN in CSP)

**Findings:**
- ✅ Component-level `next/dynamic` for below-fold and conditional components.
- ✅ IBM Plex fonts with `display: swap`.
- ✅ Static prerender for landing pages + long-cache headers.
- 🟡 `prefers-reduced-motion` not honored in animations — accessibility + perceived performance issue.
- 🟡 `ResultCard` renders all matches; at ~200 files with heavy matches, DOM grows large. Add virtualization + pagination past ~200 matches.
- 🟡 Onboarding tip toast fires 800 ms after mount unconditionally — small but non-zero TBT cost.
- 🟡 pdf.js worker on cdnjs.cloudflare.com — one third-party dependency; document + monitor availability.

**Concrete recommendations:**
1. Wrap all animations in `@media (prefers-reduced-motion: no-preference)`.
2. Virtualize match lists past a threshold (~200 rows) using a library like `react-virtuoso` (25 kB gz; only loaded when needed).
3. Consider self-hosting pdf.js worker for CSP hardening and CDN independence — cost is ~1.3 MB more in the app assets; the current `import.meta.url` Next.js constraint would need workaround.

---

## 7. Scalability — 10 / 1K / 10K / 100K / 1M users

**Honest read:** this is a client-side app. **Search scales with the user's device, not our servers.** The server surface is tiny:

| Component | Bottleneck | 100 → 1M path |
|---|---|---|
| Static hosting (Vercel) | none | CDN scales freely |
| `/api/proxy-pdf` | 30 req/min in-memory rate limit per lambda; 30s function timeout; 50 MB response | At 10K+ users add Upstash Redis for global rate limit; consider streaming binary response instead of base64 for large files |
| `/api/track` (telemetry) | Neon Postgres free tier (512 MB); on-read SQL aggregates | Beyond ~1M events: add nightly rollup via Vercel Cron → dashboards read from `daily_stats`; beyond ~20M rows: partition by month, or move to ClickHouse/Tinybird |
| `/api/admin/*` | Neon connection limits | Already low-QPS (admin traffic only) |
| Search itself | User's browser | No server scaling needed |

**Circuit breaker / retry:** Client tracker already batches and fails silently. Proxy fetch has bounded timeout + rate limit. No queues to break.

**Documented residual:** DNS rebinding on proxy would require undici connection pinning — noted as future hardening. Documented in `ANALYTICS_AUDIT.md` scalability section.

---

## 8. Security audit

**Already solid** (verified this session):
- ✅ CSP + security headers in `next.config.js`.
- ✅ HMAC-signed httpOnly admin session cookie, timing-safe compare, brute-force rate limit on login.
- ✅ SSRF blocklists on proxy: private IPv4/v6 ranges, CGNAT, link-local, IMDS, common internal hostnames. HTTPS-only.
- ✅ Magic-byte PDF validation server-side (not just content-type).
- ✅ Streaming size enforcement with early abort.
- ✅ XSS-safe search highlighting: escape → then regex-wrap in `<mark>`.
- ✅ Telemetry route: bot filter, admin self-exclusion, idempotent inserts, no PII, no IPs stored.
- ✅ Zod validation at every API boundary.
- ✅ No secrets in client bundle (audited env var prefixes).

**Fixed in this batch** (see step 5):
- 🔒 Redirects now validated per-hop (was: initial-URL only) — SSRF via 302 chain closed.
- 🔒 IP-literal hostnames rejected outright — closes `::ffff:` IPv4-mapped IPv6 gap and WHATWG canonicalization tricks.
- 🔒 33 new security-focused unit tests lock these invariants in.

**Documented residual:**
- ⚠️ DNS rebinding: attacker DNS with 0 TTL can rebind between validation and connect. Full fix requires connection pinning (undici Agent with custom `lookup`) — deliberate future work; residual exfiltration risk is small because responses must pass `%PDF` magic + content-type + are only reflected to the requesting client.
- ⚠️ In-memory rate limiter is per-lambda; documented tradeoff. Externalize when traffic warrants.

**Dependency vulnerabilities:** `npm audit` — clean at time of commit.

---

## 9. Accessibility

- ✅ ARIA combobox on search history dropdown (fixed in earlier PR).
- ✅ Skip-to-content link.
- ✅ Keyboard navigation on search + upload zone (Enter, Escape, Arrow keys).
- ✅ Focus-visible outline via `:focus-visible`.
- 🟡 `--text-3` contrast on 10px labels below AA — fix in UX P2 batch.
- 🟡 Touch targets: FileList remove ✕ opacity-0 until hover — invisible on touch. Fix.
- 🟡 `prefers-reduced-motion` not honored.
- 🟡 Search options behind gear icon — screen-reader label present (`title="Search options"`) but the active state has no ARIA indication.

---

## 10. Analytics

Already **production-grade** as of this session — see `ANALYTICS_AUDIT.md`. Identity model unit-tested. Bot filtering, admin self-exclusion, event idempotency, session semantics all verified. Dashboard covers Overview, Traffic (GA4 + GSC), Product, System, Insights (funnel + recommendations), Command Center (realtime).

**Nice-to-haves for later:**
- Scroll depth on landing pages.
- Rage-click detection (three clicks on the same target within 500 ms).
- Session replay via PostHog free tier — **only if** the privacy story is clearly disclosed (would need to be opt-in given the brand promise).

---

## 11. AI opportunities (privacy-compatible)

Server-side AI conflicts with the "files never leave your browser" promise. **Client-side AI is the only fit.**

- **Semantic search via WebGPU/WASM embeddings.** Local model (`all-MiniLM-L6-v2` quantized, ~20 MB) generates embeddings for each PDF page in the browser. Enables "find pages about revenue growth" instead of exact-string matching. Genuinely differentiating; nobody else offers privacy-preserving semantic PDF search. Effort: ~1 month.
- **OCR via Tesseract-WASM.** Top zero-result complaint candidate is scanned PDFs (no text layer). Client-side OCR is slow (~5–10s/page) but tolerable in the background. Effort: ~1 week.
- **Fuzzy / regex search modes.** Non-AI but often-requested. Effort: 1 day.
- **Smart tagging / auto-categorization.** WASM classifier per document. Nice-to-have.

Server-side AI (summaries, Q&A) is powerful but **requires either uploading content or a hybrid tier** — only introduce if the hybrid tier launches and is explicit about tradeoffs.

---

## 12. Code quality & cleanup — findings

Full findings surfaced by the Explore audit; the safe subset was **executed in this batch** (commits `ff3f02b`, `9c8c895`, `1eb8e4e`, `SSRF commit`):

**Executed:**
- 🗑️ Dead exports removed: `generateCsrfToken`, `MAX_TOTAL_SIZE_BYTES`, `computeContentHash` (`security/index.ts`); `filenameFromUrl`, `plural`, `sleep`, `clamp` (`utils.ts`); `isDuplicate` (`pdf/engine.ts`); entire `ui/Skeleton.tsx` component.
- 🔁 `formatBytes` duplication removed (was defined byte-identically in two files).
- 📦 `uuid` + `@types/uuid` dependencies removed — replaced with `crypto.randomUUID()` (2 call sites, browser-only, secure-context already required).
- 🎨 5 components migrated from raw `clsx` to `cn()` wrapper — locks in tailwind-merge conflict resolution for future edits. Verified behavior-neutral.
- 🔒 SSRF gaps closed: per-hop redirect validation, IP-literal rejection. 33 new unit tests.

**Kept intentionally (with reason):**
- `IUserRepository.getSession/upsertSession` — documented future-migration contract to MongoDB. Removing would erase a load-bearing design decision.
- `getFullHistory` — used by `useUserHistory`.
- In-memory rate limiter in security module — documented MVP tradeoff.

**Flagged, not touched** (need product decision):
- The 500 MB session cap (`MAX_TOTAL_SIZE_BYTES`) was declared but never enforced. `totalSizeBytes` is tracked in the search hook without being checked. Either wire enforcement into `addFiles` or delete the tracking. This batch deleted the unused constant; enforcement is a follow-up decision.
- `contentHashes` ref in `useSearchEngine` is only ever cleared, never populated. Legacy of the deleted deduplication path. Safe to remove; kept to avoid scope creep.

**Zero findings** (verified clean):
- No `console.log` (only allowed `.warn`/`.error` inside error boundaries).
- No `TODO`/`FIXME`/`HACK` comments.
- No `any` types (`strict: true`).
- No `dangerouslySetInnerHTML` on untrusted input (all uses are `JSON.stringify(schema)` or pre-sanitized `highlightedHtml`).
- Landing pages share `LandingPageShell` — zero duplication.

---

## 13. Refactoring plan (post-batch, not executed)

Deferred to future PRs because they're either bigger or need product decisions:

- **Enforce or delete the 500 MB session cap.** Product call.
- **Delete unused `contentHashes` ref** in `useSearchEngine.ts`.
- **Extract redirect-following logic**: already done in this batch (`proxyFetch.ts`).
- **Consider self-hosting pdf.js worker** for CSP hardening + CDN independence. Adds ~1.3 MB to assets; needs Next.js build-config workaround.
- **Search options as inline chips** (see UX P2). Removes the unlabeled gear icon.
- **PWA manifest + service worker** for offline / installable. Real retention lever.

---

## 14. Prioritized roadmap

### Quick wins (1–2 hours)

- ✅ Cleanup batch (this PR).
- Add `prefers-reduced-motion` guard to all animations.
- Bump `--text-3` for 10-px instructional text to ≥4.6:1 contrast.
- Always-visible ✕ on file chips for touch (`@media (hover:none)`).

### One-day

- **UX P0**: window-level drop overlay + preventDefault; ⌘K always works (never disable search input) — prevents actual session loss and honors advertised behavior.
- Move "Try a sample PDF" link *inside* the empty drop zone.
- Filled `Choose PDF files` button inside the zone; restyle Quick Load badge to ghost.
- Shareable deep links: parse `?q`, `?url` on load, prefill workspace, "Copy shareable link" button in ResultsSummary.

### One-week

- Compress hero + unify workspace card so `01 + 02` share first paint on desktop and mobile.
- Progressive disclosure: URL + Bulk + Quick Load behind "Add by URL ▸".
- Never-disabled search with queued-query coach mark.
- FileList → in-workspace chips (no layout shift).
- Search options as labeled chips; actionable zero-result state (retry with different options).
- Add 8–12 programmatic landing pages targeting long-tail queries.

### One-month

- **PWA** (manifest, service worker, installable).
- **Browser extension** (Chrome/Firefox/Edge — top-of-funnel).
- **Free tools cluster** (`/tools/pdf-page-counter`, `/tools/pdf-text-extractor`, etc. — SEO magnets).
- Client-side **OCR** (Tesseract-WASM) for scanned PDFs.
- Match-list virtualization past ~200 rows.
- Sticky mobile search bar; full 44 px touch-target pass.

### One-quarter (hybrid tier launch)

- Optional accounts (email magic-link, no password).
- Saved workspaces = URL list + saved queries (never file content). Cross-device sync via Neon.
- Weekly digest for saved workspaces ("new matches in your saved sources").
- Referral program unlocking hybrid-tier features.

### High impact / low effort

Cleanup batch (shipped) · SSRF hardening (shipped) · reduced-motion guard · shareable deep links · in-zone filled CTA · move sample link.

### High impact / high effort

Workspace restructure · PWA · browser extension · WebGPU semantic search · programmatic SEO expansion · hybrid accounts tier.

### Must-fix before "real launch"

- SSRF hardening (shipped this batch).
- Analytics identity model fix (shipped in PR #4).
- UX P0 trust fixes (drop overlay, ⌘K).
- WCAG contrast + touch-target fixes.

### Features to delete

None beyond dead code (already executed). The current feature surface is small and mostly earning its keep.

### Features to merge

- Combine URL input's "Bulk" mode with Quick Load's pattern loader — both are "many URLs at once."

### Growth experiments (measurable via analytics)

1. Compressed hero A/B (upload conversion rate).
2. Filled CTA in zone (upload CTR).
3. Queued search from disabled state (search rate / session).
4. Shareable deep links introduced via clipboard (referral coefficient).

### Future roadmap

Q3: cleanup + UX P0/P1 + shareable links.
Q4: PWA + programmatic SEO expansion + extension.
Q1 2027: WebGPU semantic search + hybrid accounts.

---

## 15. Effort estimates

| Bucket | Items | Rough eng-days |
|---|---|---|
| Quick wins | reduced-motion, contrast, touch targets, deep links (parse+copy) | 2 |
| UX P0 (day) | drop overlay, ⌘K, filled CTA, sample-in-zone | 1 |
| UX P1 (week) | workspace restructure, progressive disclosure, coach mark, chips | 4 |
| Programmatic SEO | 12 new landing pages + comparison pages | 3 |
| Free tools cluster | 4 client-side utilities | 4 |
| PWA | manifest + service worker + install prompt | 2 |
| Browser extension | Chrome MV3 + Firefox WebExtension | 4 |
| Client OCR | Tesseract-WASM integration + progress UI | 4 |
| Semantic search | WebGPU embeddings + index + hybrid retrieval | 15–20 |
| Hybrid accounts tier | auth, workspaces, digest cron | 10 |

Total near-term (through end-Q4): ~30 eng-days. Well within reach for a solo builder over a quarter.

---

**End of report.** Implementation batch shipped this session; roadmap items above are the prioritized next steps.
