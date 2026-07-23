# PDFSearch Growth Playbook

Organic-growth strategy for [pdfsearch.info](https://www.pdfsearch.info). Companion to the code shipped in this batch (SEO overhaul, feedback system, retention pack).

> **Positioning guardrail — read first.** PDFSearch is an **exact-text PDF search** tool that runs **100% in the browser**. It is **not** an AI/LLM product: it does not summarize, answer questions, or "chat with" PDFs. Every keyword, page, and post below targets **text-search intent**. We deliberately **do not** chase "AI PDF search", "chat with PDF", or "ask questions from PDF" — ranking for those terms would draw users expecting a chatbot, who bounce immediately (intent mismatch that *hurts* rankings) and leave bad reviews. Our honest differentiators are **privacy** (files never leave the browser), **multi-file/bulk** search, **exact/whole-word/case-sensitive** matching, and **free, no-signup**.

---

## 1. Keyword map (honest clusters)

Grouped by the pages that now exist. Volumes are directional; validate in Search Console once data accrues.

### Core tool intent (the `tool` pages)
| Keyword cluster | Landing page | Angle |
|---|---|---|
| search inside pdf, search text in pdf | `/search-text-in-pdf`, `/how-to-search-pdf` | exact-match, whole-word |
| find words/text in pdf | `/find-words-in-pdf` | list every occurrence |
| search multiple / bulk pdf | `/search-multiple-pdfs`, `/bulk-pdf-search` | 200 files at once |
| pdf search online / free | `/pdf-search-online`, `/free-pdf-search-engine` | zero-install, no signup |
| search scanned pdf | `/search-scanned-pdf` | text-layer test + OCR honesty |

### Persona intent (the `persona` pages — built this batch)
students · researchers · lawyers · finance · recruiters · engineers · government documents · technical manuals. Each ranks for "pdf search for &lt;persona&gt;" + the persona's specific job ("search a résumé batch", "search discovery documents", "error-code lookup").

### Comparison intent (blog)
"ctrl+f vs …", "best pdf search tools" — capture users evaluating options.

### Long-tail how-to (blog + FAQ schema)
"how to search a scanned pdf", "how to search multiple pdfs at once", "search a 500-page pdf". These win featured snippets via the FAQ/HowTo schema already on the pages.

**Explicitly off-strategy:** any "AI", "chat with PDF", "ask questions", "GPT", "summarize PDF" term. Revisit only if the product gains those features.

---

## 2. Content calendar (next ~12 pieces)

Ship ~1/week. Each must carry 3+ internal links (to tool + persona pages) and target a snippet.

| # | Working title | Target keyword | Funnel | Links to |
|---|---|---|---|---|
| 1 | How to search multiple PDFs at once | search multiple pdfs | TOFU | `/search-multiple-pdfs`, `/bulk-pdf-search` |
| 2 | The text-layer test: is your PDF searchable? | searchable pdf | MOFU | `/search-scanned-pdf` |
| 3 | Whole-word vs substring search in PDFs | exact pdf search | MOFU | `/search-text-in-pdf` |
| 4 | Search PDFs without uploading them | private pdf search | BOFU | `/pdf-search-for-lawyers` |
| 5 | Résumé keyword screening, step by step | search resumes pdf | BOFU | `/pdf-search-for-recruiters` |
| 6 | Literature-review search workflow | search research papers | MOFU | `/pdf-search-for-researchers` |
| 7 | Find a covenant across 10 filings | search 10-k pdf | BOFU | `/pdf-search-for-finance` |
| 8 | Error-code lookup in equipment manuals | search pdf manual | BOFU | `/search-technical-manuals` |
| 9 | Searching a FOIA release | search foia pdf | MOFU | `/search-government-documents` |
| 10 | Ctrl+F's limits (deep dive) | ctrl+f alternative | TOFU | `/blog/ctrlf-vs-advanced-pdf-search` |
| 11 | Exam-prep PDF search for students | study pdf search | BOFU | `/pdf-search-for-students` |
| 12 | Datasheet part-number search | search datasheet pdf | BOFU | `/pdf-search-for-engineers` |

Already shipped this batch: lawyers-500-page, student-workflow, how-to-search-scanned-pdfs.

---

## 3. Backlink plan

Prioritize honest, relevant placements. **Do not** submit to "AI tool" directories — wrong category, and it invites the AI-intent mismatch we're avoiding.

**Tool directories (high value, correct category):**
- AlternativeTo — list as an alternative to Ctrl+F / Acrobat search: https://alternativeto.net/manage-app/
- Slant — "best PDF search tools" topic: https://www.slant.co/
- SaaSHub: https://www.saashub.com/submit-software
- ToolFinder / Toolote and similar productivity-tool directories
- LibHunt (if positioned as an open, privacy-first web tool)
- StackShare (privacy-first browser tool)

**Launch platforms:**
- **Product Hunt** — https://www.producthunt.com/posts/new — lead with the privacy angle ("PDF search that never uploads your files"). Line up a hunter, launch Tue–Thu 00:01 PT.
- **Hacker News — Show HN** — https://news.ycombinator.com/showhn.html — the in-browser/privacy architecture is genuinely HN-interesting. Title: "Show HN: PDF search that runs entirely in your browser". Be present in comments.
- **Indie Hackers** — https://www.indiehackers.com/ — build-in-public post on the privacy architecture.
- **BetaList** — https://betalist.com/submit

**Content republishing (canonical back to your post):**
- dev.to, Hashnode, Medium — republish the technical posts (e.g. the SSRF-hardening or in-browser-parsing write-up) with `rel=canonical` to pdfsearch.info. Great for developer backlinks.

**Guest posting:** legal-tech blogs (privacy angle for the lawyer page), student/study blogs, r/productivity-adjacent newsletters.

After a Product Hunt / GitHub / X presence exists, **populate `Organization.sameAs`** in `src/app/layout.tsx` with those profile URLs (currently empty).

---

## 4. Community playbook

**Golden rule:** be genuinely helpful first; link only when the tool actually answers the question. Most bans come from drive-by self-promotion. Aim for a ~10:1 help-to-link ratio.

**Genuinely relevant subreddits** (product actually helps):
| Subreddit | Why it fits | Approach |
|---|---|---|
| r/productivity | multi-PDF search is a real workflow win | answer "how do I search across many PDFs" threads |
| r/students, r/GradSchool, r/PhD | textbook/paper piles | the student & researcher workflows |
| r/LawSchool, r/paralegal | discovery/casebook search + privacy | the lawyer/confidentiality angle |
| r/datacurator, r/DataHoarder | searching large local doc collections | bulk search, no upload |
| r/Recruitment, r/recruiting | résumé keyword screening | the recruiter workflow |
| r/legaltech | privacy-first document tooling | architecture + privacy |

**Off-strategy (do NOT post the product there):** r/ChatGPT, r/OpenAI, r/Artificial, r/MachineLearning, r/LocalLLaMA — these are **AI audiences**, and PDFSearch is not AI. Posting there = intent mismatch, downvotes, "this isn't AI" comments. Skip them entirely.

**Karma/trust building:** spend the first few weeks purely answering questions with no links. Comment on "how do I search X across many files" threads with a genuine method (even if it's not always your tool). Only link when it's the best answer.

**Other communities:**
- **Quora** — answer "how to search multiple PDFs", "how to find text across PDF files" questions.
- **Stack Overflow / Super User** — only where a user asks a genuine "search across PDFs" tooling question; link sparingly, it's strict.
- **X / LinkedIn** — build-in-public + persona tips (a lawyer-focused thread, a student-focused thread).
- **Discord** — study servers, legal-tech servers, productivity servers — same help-first rule.
- **Facebook Groups** — student and paralegal groups (very promo-sensitive; help-only).

---

## 5. Monitoring setup

| Tool | Status | Setup |
|---|---|---|
| Google Search Console | integrated (admin Insights via `/api/admin/gsc`) | keep sitemap submitted; watch coverage + queries |
| Google Analytics 4 | integrated; **CSP was blocking it — fixed this batch** | set `NEXT_PUBLIC_GA_ID`; verify realtime shows hits post-deploy |
| Microsoft Clarity | code hook added | create project, set `NEXT_PUBLIC_CLARITY_ID` (CSP already allows `*.clarity.ms`) |
| Bing Webmaster | verification hook added | set `NEXT_PUBLIC_BING_VERIFICATION` (the `msvalidate.01` content value), submit sitemap |
| IndexNow | key file + ping helper added | key at `public/<key>.txt`; call `pingIndexNow([urls])` from `src/lib/seo/indexnow.ts` after publishing (manual, never on build) |
| Ahrefs Webmaster Tools | manual | free AWT account, verify, monitor backlinks/health |

**Dashboards to watch:** GSC (impressions, clicks, avg position, indexed pages, coverage errors), GA4 (organic sessions, engagement), the first-party admin dashboard (returning-visitor rate, feedback volume, top search terms), Clarity (rage-clicks, dead-clicks, scroll depth on landing pages).

---

## 6. 90-day roadmap

KPIs tracked weekly: **indexed pages** (GSC), **organic clicks & impressions** (GSC), **avg position** for tracked keywords, **returning-visitor rate** (admin dashboard), **feedback volume** (admin feedback inbox), **backlinks** (Ahrefs AWT).

### Quick wins — Weeks 1–2
- **W1:** Deploy this batch. Set `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_BING_VERIFICATION`, `RESEND_*`, `IP_HASH_SECRET`. In GSC: resubmit sitemap, request re-crawl of homepage (fabricated rating removed), confirm no structured-data errors. Verify Bing + submit sitemap. Confirm GA4 realtime now fires (was CSP-blocked).
- **W2:** Ping IndexNow for all new URLs. Submit to AlternativeTo, SaaSHub, Slant. Draft the Product Hunt + Show HN launches. Start answering questions in 2–3 subreddits (no links yet).
- *KPI targets:* all 25+ pages submitted & indexing; GA4/Clarity/Bing live; 3 directory listings.

### Medium-term — Weeks 3–8
- **W3–4:** Product Hunt launch (privacy angle). Publish content-calendar posts #1–2. Begin dev.to/Hashnode republishing.
- **W5–6:** Show HN launch. Posts #3–5. First genuine subreddit answers that include a link. Start LinkedIn/X persona threads.
- **W7–8:** Posts #6–8. Guest-post outreach to 1 legal-tech + 1 student blog. Review GSC: double down on pages gaining impressions, improve titles/FAQs on underperformers.
- *KPI targets:* 500+ organic clicks/mo trending up; 10–15 referring domains; feedback inbox receiving real submissions; returning-visitor rate measurable.

### Long-term — Weeks 9–13
- **W9–11:** Posts #9–12. Populate `Organization.sameAs` with PH/GitHub/X. Pursue backlinks from any press the launches generated.
- **W12–13:** Content refresh pass — update the top-performing posts, add internal links to newly-ranking pages, expand FAQs targeting the snippet queries GSC now reveals. Evaluate whether long-tail query clusters justify (genuinely unique) programmatic pages — only if each would have real distinct content.
- *KPI targets:* organic clicks 3–5× week-1 baseline; 25+ referring domains; several page-1 keywords; a steady feedback stream feeding the roadmap.

---

## 7. Guardrails (do not violate)

- No AI/"chat with PDF" claims anywhere — keywords, copy, or directories.
- No fabricated ratings, review counts, testimonials, or usage counters (the fake `aggregateRating` was removed; don't reintroduce social proof until it's real — the feedback inbox is how you'll collect genuine quotes).
- Marketing privacy copy is intentionally left as-is by product decision.
- Help-first in every community; never spam.
- Server secrets (`RESEND_*`, notify email, audience id) never appear client-side.
