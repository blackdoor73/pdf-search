/**
 * Two responsibilities:
 *
 * 1. Guards the admin dashboard (/admin/*) and admin APIs (/api/admin/*)
 *    behind the signed session cookie. The login page and login API are the
 *    only unauthenticated paths under the matcher.
 * 2. Enforces the admin-configured country rules (see lib/admin/geoRules.ts).
 *    Search-engine crawlers and crawl-critical paths are exempted *before*
 *    any country test, so blocking a country can never cost us rankings.
 *
 * The matcher covers the whole site because the rules can be scoped
 * site-wide at runtime. `evaluateAccess` short-circuits public paths back to
 * "allowed" when the scope is admin-only (the default), and static assets
 * are excluded from the matcher outright.
 */

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import { evaluateAccess, isAdminPath } from "@/lib/admin/geoRules";
import { getGeoRules } from "@/lib/admin/settings";

const BLOCKED_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not available</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0d0d0d;color:#e5e5e5;font:14px ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}div{max-width:32rem;padding:2rem}h1{font-size:1rem;letter-spacing:.1em;text-transform:uppercase;color:#e8b931}p{color:#8a8a8a;line-height:1.6}</style></head><body><div><h1>Not available in your region</h1><p>This service is not currently offered where you are connecting from.</p></div></body></html>`;

function blockedResponse(pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unavailable_in_region" }, { status: 403 });
  }
  return new NextResponse(BLOCKED_HTML, {
    status: 403,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never let a CDN cache one visitor's geo decision for another.
      "cache-control": "no-store",
    },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminPath = isAdminPath(pathname);

  // ── Country rules ───────────────────────────────────────────────────────
  // Reading the rules costs a DB round trip on a cold isolate. On admin
  // paths that is free (a handful of requests); on public pages it would sit
  // in front of every visitor's TTFB, so site-wide enforcement is gated
  // behind an explicit env flag. Everything else — enabling, the country
  // list, deny/allow — stays editable from /admin/settings without a deploy.
  const siteWidePossible = process.env.GEO_SITEWIDE === "true";
  if (adminPath || siteWidePossible) {
    const rules = await getGeoRules();
    if (rules.enabled) {
      const decision = evaluateAccess({
        pathname,
        country: req.headers.get("x-vercel-ip-country"),
        userAgent: req.headers.get("user-agent") ?? "",
        rules,
      });
      if (!decision.allowed) return blockedResponse(pathname);
    }
  }

  // ── Admin auth ──────────────────────────────────────────────────────────
  if (!adminPath) return NextResponse.next();

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && (await verifySessionToken(token))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except static assets. Crawl-critical paths (robots.txt,
  // sitemap.xml) still reach the middleware but are exempted inside
  // evaluateAccess, so that rule lives in exactly one place.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|mjs)$).*)",
  ],
};
