# PDFSearch

**Multi-PDF search engine. In-memory processing. Nothing stored.**

Search across hundreds of PDFs simultaneously — uploaded files or remote URLs. Results appear in seconds. Your files never touch a database or filesystem.

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local

# 3. Run
npm run dev
# → http://localhost:3000
```

---

## Architecture

```
pdfsearch/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── proxy-pdf/route.ts   # SSRF-protected URL fetcher
│   │   ├── layout.tsx               # Root layout + fonts
│   │   ├── page.tsx                 # Main page (client)
│   │   └── globals.css              # Design tokens + base styles
│   ├── components/
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx       # Drag & drop with magic-byte validation
│   │   │   ├── UrlInput.tsx         # URL input with tooltip + history
│   │   │   ├── FileList.tsx         # Loaded files display
│   │   │   └── QuickLoad.tsx        # Kashipur voter list preset
│   │   ├── search/
│   │   │   ├── SearchBar.tsx        # Inline search with history dropdown
│   │   │   ├── SearchProgress.tsx   # Animated progress bar
│   │   │   ├── ResultCard.tsx       # Per-PDF result with highlights
│   │   │   └── ResultsSummary.tsx   # Stats summary bar
│   │   └── ui/
│   │       ├── PrivacyBadge.tsx     # Trust messaging
│   │       └── EmptyState.tsx       # Zero results state
│   ├── hooks/
│   │   ├── useSearchEngine.ts       # Core search orchestration
│   │   └── useUserHistory.ts        # Cookie history access
│   ├── lib/
│   │   ├── pdf/engine.ts            # pdf.js wrapper + search logic
│   │   ├── security/index.ts        # SSRF, XSS, validation, rate limiting
│   │   └── storage/userHistory.ts   # IUserRepository + cookie impl
│   └── types/index.ts               # All TypeScript types
```

---

## Data Flow

```
User uploads file
  → validatePdfFile() [magic bytes + MIME + size]
  → Load to ArrayBuffer (browser memory)
  → pdf.js text extraction
  → Search in memory
  → Results rendered
  → ArrayBuffer GC'd on next render cycle

User pastes URL
  → validateProxyUrl() [SSRF blocklist + scheme check]
  → POST /api/proxy-pdf
      → Rate limit check
      → Zod schema validation
      → Fetch with 15s timeout + 50MB stream limit
      → Magic bytes validation server-side
      → Return base64 to browser
  → Decode to ArrayBuffer in browser
  → Same pipeline as file upload
  → Nothing written to disk at any point
```

---

## Security Architecture

### SSRF Prevention (`/api/proxy-pdf`)
- Blocks all private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x)
- Blocks IPv6 loopback + link-local (::1, fc::/7, fe80::/10)
- Blocks cloud metadata endpoints (169.254.169.254, metadata.google.internal)
- Blocks embedded credentials (user:pass@host)
- HTTPS-only scheme enforcement
- **Production hardening**: Add DNS resolution check to verify resolved IP is not private (DNS rebinding protection)

### XSS Prevention
- All text from PDFs passes through `escapeHtml()` before `innerHTML`
- Highlight injection: HTML-escape FIRST, then wrap `<mark>` tags
- No `dangerouslySetInnerHTML` with unescaped user input

### Input Validation
- Zod schemas on all API inputs
- Magic byte validation (not just MIME type)
- Filename sanitization (strips path traversal, null bytes, control chars)
- Query length limits (500 chars max)

### Rate Limiting
- 30 proxy requests / IP / minute
- In-memory for MVP; swap `checkRateLimit()` with Redis/Upstash for production

### Cookie Security
- `SameSite=Strict` (CSRF protection)
- `Secure` flag on HTTPS (enforced in production)
- `HttpOnly` not applicable (client JS reads history)
- Never stores file content — only filenames, URLs, search queries
- Max ~3.5KB payload (trimmed to fit cookie limits)

### Content Security Policy
See `next.config.js` headers. Key restrictions:
- `frame-ancestors 'none'` — blocks clickjacking
- `connect-src 'self'` — prevents data exfiltration via fetch
- `worker-src blob:` — required for pdf.js worker

### Secrets Management
- Zero secrets in this codebase (no API keys needed for MVP)
- Future secrets (Redis, MongoDB) go in `.env.local` only
- `.env.local` is git-ignored

---

## Cookie-based History

Stores per-session metadata only:
```typescript
interface UserHistory {
  sessionId: string;        // UUID, not tied to PII
  recentFiles: HistoryEntry[];  // Filenames + URLs (no content)
  recentSearches: SearchHistoryEntry[];  // Query strings + match counts
  createdAt: number;
  updatedAt: number;
}
```

Cookie TTL: 90 days. Clearing cookies = session reset (by design).

---

## MongoDB Migration Path

The storage layer implements `IUserRepository`:

```typescript
interface IUserRepository {
  getSession(sessionId: string): Promise<UserHistory | null>
  upsertSession(history: UserHistory): Promise<void>
  addFileToHistory(sessionId: string, entry: HistoryEntry): Promise<void>
  addSearchToHistory(sessionId: string, entry: SearchHistoryEntry): Promise<void>
  clearHistory(sessionId: string): Promise<void>
}
```

**To migrate:**
1. Create `MongoUserRepository` implementing `IUserRepository`
2. Add MongoDB schema (suggest Mongoose or native driver):
   ```
   Collection: user_sessions
   Index: { sessionId: 1 } unique
   Index: { updatedAt: 1 } TTL (90 days)
   ```
3. In `getUserRepository()`, return Mongo impl when `process.env.USE_MONGO === 'true'`
4. No other code changes needed — all call sites use the interface

**Suggested Mongo schema:**
```js
{
  sessionId: String,      // UUID
  recentFiles: [{ id, name, type, url, addedAt, lastQuery }],
  recentSearches: [{ query, timestamp, matchCount }],
  createdAt: Date,
  updatedAt: Date         // TTL index on this field
}
```

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars
vercel env add NEXT_PUBLIC_APP_URL
```

**Vercel config notes:**
- `maxDuration: 30` on proxy route (handles slow external PDFs)
- Edge runtime NOT used (needs Node.js Buffer for base64)
- No persistent storage needed (stateless by design)

---

## Production Hardening Checklist

- [ ] Enable HSTS header (uncomment in next.config.js — HTTPS only)
- [ ] Tighten CSP `script-src` (remove `unsafe-eval` if pdf.js worker allows)
- [ ] Replace in-memory rate limiter with Upstash Redis
- [ ] Add DNS rebinding check in proxy route (resolve hostname, verify not private)
- [ ] Set up Sentry for error tracking
- [ ] Add VirusTotal API hook in proxy route (async scan before returning bytes)
- [ ] Add Cloudflare WAF in front of proxy endpoint
- [ ] Load test proxy endpoint (suggest k6 or Artillery)
- [ ] Set up uptime monitoring (Better Uptime / Checkly)

---

## Future Improvements (Staff Engineer Recommendations)

1. **Web Worker for PDF processing** — Move pdf.js extraction off main thread to prevent UI jank on large files
2. **Streaming results** — Show partial results as each PDF completes (via ReadableStream or SSE) rather than waiting for all
3. **PDF page preview** — Render matched page as canvas thumbnail in result card
4. **Export results** — Download matched results as CSV/JSON
5. **Saved searches** — Named search presets stored in localStorage
6. **Keyboard navigation** — Full cmd+k command palette for power users
7. **PWA** — Offline support for previously loaded local files
8. **Search highlighting PDF viewer** — Jump directly to matching page in embedded PDF viewer
