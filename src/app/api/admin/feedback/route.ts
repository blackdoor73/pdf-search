/**
 * Admin feedback API. Auth enforced by middleware (/api/admin/* matcher).
 *
 * GET    ?q=&category=&status=&from=&to=&page=&pageSize=   — list
 * PATCH  { id, status?, adminNote? }                        — resolve/annotate
 * DELETE { ids: number[] }                                  — delete rows
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import {
  clampPage,
  clampPageSize,
  deleteFeedback,
  getFeedback,
  updateFeedback,
  type FeedbackFilters,
} from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_CONFIGURED = { configured: false } as const;

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED);

  const p = req.nextUrl.searchParams;
  const filters: FeedbackFilters = {
    q: p.get("q")?.slice(0, 200) || undefined,
    category: p.get("category") || undefined,
    status:
      p.get("status") === "resolved"
        ? "resolved"
        : p.get("status") === "new"
        ? "new"
        : undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    page: clampPage(p.get("page")),
    pageSize: clampPageSize(p.get("pageSize")),
  };

  try {
    await ensureSchema();
    return NextResponse.json({ configured: true, ...(await getFeedback(filters)) });
  } catch (err) {
    console.error("[admin/feedback] list failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["new", "resolved"]).optional(),
  adminNote: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const { id, ...patch } = parsed.data;
    return NextResponse.json(await updateFeedback(id, patch));
  } catch (err) {
    console.error("[admin/feedback] patch failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) });

export async function DELETE(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  try {
    await ensureSchema();
    return NextResponse.json(await deleteFeedback(parsed.data.ids));
  } catch (err) {
    console.error("[admin/feedback] delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
