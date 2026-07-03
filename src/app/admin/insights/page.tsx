"use client";

/**
 * Growth Insights — actionable, not just descriptive:
 * - user dropoff funnel (visit → load → search → success → export)
 * - high-bounce landing pages (GA4)
 * - keyword ranking opportunities (GSC position 4–20)
 * - auto-generated recommendations from the numbers
 */

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { FunnelChart } from "@/components/admin/charts";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Panel,
  RangePicker,
} from "@/components/admin/ui";
import { fmtNum, fmtPct, useAdminData } from "@/components/admin/useAdminData";

interface FunnelData {
  configured: boolean;
  sessions: number;
  withUpload: number;
  withSearch: number;
  withSuccess: number;
  withExport: number;
}

interface TrafficData {
  configured: boolean;
  landingPages: { page: string; sessions: number; bounceRate: number }[];
}

interface GscData {
  configured: boolean;
  opportunities: { key: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

function buildRecommendations(
  funnel: FunnelData | null,
  traffic: TrafficData | null,
  gsc: GscData | null
): string[] {
  const recs: string[] = [];

  if (funnel && funnel.sessions > 20) {
    const uploadRate = funnel.withUpload / funnel.sessions;
    const searchRate = funnel.withUpload ? funnel.withSearch / funnel.withUpload : 0;
    const successRate = funnel.withSearch ? funnel.withSuccess / funnel.withSearch : 0;
    if (uploadRate < 0.3) {
      recs.push(
        `Only ${Math.round(uploadRate * 100)}% of sessions load a PDF. The landing page may not communicate the core action fast enough — consider a more prominent drop zone or a one-click sample PDF above the fold.`
      );
    }
    if (funnel.withUpload > 10 && searchRate < 0.6) {
      recs.push(
        `${Math.round((1 - searchRate) * 100)}% of users who load PDFs never run a search. Auto-focus the search input after files load, or suggest example queries.`
      );
    }
    if (funnel.withSearch > 10 && successRate < 0.5) {
      recs.push(
        `Search success rate is ${Math.round(successRate * 100)}%. Check the zero-result terms on the Product page — users may expect fuzzy/OCR search the product doesn't do yet.`
      );
    }
  }

  for (const p of traffic?.landingPages ?? []) {
    if (p.sessions >= 25 && p.bounceRate > 0.75) {
      recs.push(
        `"${p.page}" bounces ${Math.round(p.bounceRate * 100)}% of ${p.sessions} sessions. Add an inline demo or stronger CTA linking to the tool.`
      );
    }
  }

  const opps = gsc?.opportunities ?? [];
  if (opps.length > 0) {
    const top = opps[0];
    recs.push(
      `"${top.key}" gets ${top.impressions} impressions at position ${top.position.toFixed(1)} — improving that page's title/content could move it to page 1. ${opps.length - 1} more opportunities below.`
    );
  }

  return recs;
}

export default function AdminInsightsPage() {
  const [days, setDays] = useState(30);
  const { data: funnel, error, loading } = useAdminData<FunnelData>(
    `/api/admin/stats?section=funnel&days=${days}`
  );
  const { data: traffic } = useAdminData<TrafficData>(`/api/admin/traffic?days=${days}`);
  const { data: gsc } = useAdminData<GscData>(`/api/admin/gsc?days=${days}`);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (funnel && !funnel.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!funnel) return null;

  const recommendations = buildRecommendations(funnel, traffic, gsc);
  const highBounce = (traffic?.landingPages ?? [])
    .filter((p) => p.sessions >= 10)
    .sort((a, b) => b.bounceRate - a.bounceRate)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Growth Insights</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="funnel" days={days} />
          <RangePicker days={days} onChange={setDays} />
        </div>
      </div>

      {recommendations.length > 0 && (
        <Panel title="Recommended actions">
          <ul className="space-y-3">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <span className="font-sans text-sm text-[var(--text-2)] leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={`User dropoff funnel — last ${days} days`}>
        <FunnelChart
          stages={[
            { label: "Visited", value: funnel.sessions },
            { label: "Loaded PDFs", value: funnel.withUpload },
            { label: "Ran a search", value: funnel.withSearch },
            { label: "Found results", value: funnel.withSuccess },
            { label: "Exported CSV", value: funnel.withExport },
          ]}
        />
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="High-bounce landing pages (GA4)">
          {traffic && !traffic.configured ? (
            <p className="font-mono text-xs text-[var(--text-3)]">
              Configure GA4 to see bounce-rate insights.
            </p>
          ) : (
            <DataTable
              headers={["Page", "Sessions", "Bounce"]}
              align={["l", "r", "r"]}
              rows={highBounce.map((p) => [p.page, fmtNum(p.sessions), fmtPct(p.bounceRate)])}
            />
          )}
        </Panel>

        <Panel title="Keyword ranking opportunities (GSC)">
          {gsc && !gsc.configured ? (
            <p className="font-mono text-xs text-[var(--text-3)]">
              Configure Search Console to see ranking opportunities.
            </p>
          ) : (
            <DataTable
              headers={["Query", "Impressions", "CTR", "Position"]}
              align={["l", "r", "r", "r"]}
              rows={(gsc?.opportunities ?? []).map((o) => [
                o.key,
                fmtNum(o.impressions),
                fmtPct(o.ctr),
                o.position.toFixed(1),
              ])}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
