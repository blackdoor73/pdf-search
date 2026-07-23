/**
 * Uploaded-document metadata admin API.
 *
 * GET    /api/admin/documents?q=&from=&to=&minPages=&maxPages=&minBytes=&maxBytes=
 *                            &status=&source=&dupesOnly=&sort=&dir=&page=&pageSize=
 * DELETE /api/admin/documents  body: { ids?: number[], sha256?: string }
 *
 * Only metadata rows exist — no file bytes are ever stored, so there is
 * nothing to view or download. Delete removes the metadata rows.
 * Auth enforced by middleware (matcher covers /api/admin/*).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import {
  clampPage,
  clampPageSize,
  deleteDocuments,
  getDocuments,
  type DocumentFilters,
} from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_CONFIGURED = { configured: false } as const;

function intParam(v: string | null): number | undefined {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED);

  const p = req.nextUrl.searchParams;
  const filters: DocumentFilters = {
    q: p.get("q")?.slice(0, 100) || undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    minPages: intParam(p.get("minPages")),
    maxPages: intParam(p.get("maxPages")),
    minBytes: intParam(p.get("minBytes")),
    maxBytes: intParam(p.get("maxBytes")),
    status: p.get("status") === "error" ? "error" : p.get("status") === "ok" ? "ok" : undefined,
    source: p.get("source") === "url" ? "url" : p.get("source") === "file" ? "file" : undefined,
    dupesOnly: p.get("dupesOnly") === "true",
    sort: (["ts", "size_bytes", "page_count"] as const).find((s) => s === p.get("sort")),
    dir: p.get("dir") === "asc" ? "asc" : "desc",
    page: clampPage(p.get("page")),
    pageSize: clampPageSize(p.get("pageSize")),
  };

  try {
    await ensureSchema();
    return NextResponse.json({ configured: true, ...(await getDocuments(filters)) });
  } catch (err) {
    console.error("[admin/documents] list failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}

const deleteSchema = z
  .object({
    ids: z.array(z.number().int().positive()).max(500).optional(),
    sha256: z.string().min(8).max(64).optional(),
  })
  .refine((b) => (b.ids?.length ?? 0) > 0 || b.sha256, {
    message: "ids or sha256 required",
  });

export async function DELETE(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ids or sha256 required" }, { status: 400 });
  }

  try {
    await ensureSchema();
    return NextResponse.json(await deleteDocuments(parsed.data));
  } catch (err) {
    console.error("[admin/documents] delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
