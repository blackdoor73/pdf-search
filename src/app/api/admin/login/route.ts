/**
 * Admin login / logout.
 *
 * POST   { password } → sets signed httpOnly session cookie (7 days)
 * DELETE              → clears the cookie
 *
 * Brute-force protection: per-IP attempt window + fixed delay on failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

const bodySchema = z.object({ password: z.string().min(1).max(256) });

const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX_ATTEMPTS_PER_15MIN = 10;

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.windowStart > 15 * 60_000) {
    attempts.set(ip, { count: 1, windowStart: now });
    if (attempts.size > 1000) attempts.clear();
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS_PER_15MIN;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin dashboard is not configured. Set ADMIN_PASSWORD." },
      { status: 503 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  let password: string;
  try {
    ({ password } = bodySchema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!(await verifyPassword(password))) {
    await sleep(750); // slow down guessing
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
