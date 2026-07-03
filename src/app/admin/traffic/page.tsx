"use client";

/**
 * Traffic — GA4 (users, sources, landing pages, geo, devices, realtime)
 * + Google Search Console (keywords bringing traffic).
 */

import { useState } from "react";
import { DonutChart, TrendChart } from "@/components/admin/charts";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  LoadingPanel,
  Panel,
  RangePicker,
  StatCard,
} from "@/components/admin/ui";
import { fmtNum, fmtPct, useAdminData } from "@/components/admin/useAdminData";

interface TrafficData {
  configured: boolean;
  required?: string[];
  series: {
    date: string;
    activeUsers: number;
    sessions: number;
    newUsers: number;
    pageviews: number;
    bounceRate: number;
  }[];
  totals: {
    activeUsers: number;
    sessions: number;
    newUsers: number;
    returningUsers: number;
    pageviews: number;
    pagesPerSession: number;
  };
  channels: { channel: string; sessions: number; users: number }[];
  landingPages: { page: string; sessions: number; bounceRate: number; avgSessionSec: number }[];
  geo: { country: string; users: number; sessions: number }[];
  devices: { device: string; users: number }[];
  browsers: { browser: string; users: number }[];
  realtime: { activeUsers: number };
}

interface GscData {
  configured: boolean;
  queries: { key: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

export default function AdminTrafficPage() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminData<TrafficData>(`/api/admin/traffic?days=${days}`);
  const { data: gsc } = useAdminData<GscData>(`/api/admin/gsc?days=${days}`);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return (
      <div className="space-y-4">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Traffic</h1>
        <ConfigNotice
          service="Google Analytics 4"
          envVars={data.required ?? []}
          docsAnchor="ga4"
        />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Traffic</h1>
        <RangePicker days={days} onChange={setDays} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Realtime users" value={fmtNum(data.realtime.activeUsers)} accent="green" sub="GA4 realtime" />
        <StatCard label="Users" value={fmtNum(data.totals.activeUsers)} sub={`${days} days`} />
        <StatCard
          label="New / returning"
          value={`${fmtNum(data.totals.newUsers)} / ${fmtNum(data.totals.returningUsers)}`}
        />
        <StatCard label="Pages / session" value={data.totals.pagesPerSession.toFixed(1)} />
      </div>

      <Panel title="Users & sessions">
        <TrendChart
          data={data.series}
          xKey="date"
          series={[
            { key: "activeUsers", label: "Users" },
            { key: "sessions", label: "Sessions" },
            { key: "newUsers", label: "New users" },
          ]}
        />
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Traffic sources">
          <DonutChart
            data={data.channels.map((c) => ({ name: c.channel, value: c.sessions }))}
          />
        </Panel>
        <Panel title="Devices & browsers">
          <div className="grid grid-cols-2 gap-2">
            <DonutChart
              data={data.devices.map((d) => ({ name: d.device, value: d.users }))}
              height={180}
            />
            <DonutChart
              data={data.browsers.slice(0, 5).map((b) => ({ name: b.browser, value: b.users }))}
              height={180}
            />
          </div>
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Top landing pages">
          <DataTable
            headers={["Page", "Sessions", "Bounce"]}
            align={["l", "r", "r"]}
            rows={data.landingPages.map((p) => [
              p.page,
              fmtNum(p.sessions),
              fmtPct(p.bounceRate),
            ])}
          />
        </Panel>
        <Panel title="Geo distribution">
          <DataTable
            headers={["Country", "Users", "Sessions"]}
            align={["l", "r", "r"]}
            rows={data.geo.map((g) => [g.country, fmtNum(g.users), fmtNum(g.sessions)])}
          />
        </Panel>
      </div>

      <Panel title="Search keywords (Google Search Console)">
        {gsc && !gsc.configured ? (
          <p className="font-mono text-xs text-[var(--text-3)]">
            Search Console not configured — set <code className="text-[var(--accent)]">GSC_SITE_URL</code> to enable keyword data.
          </p>
        ) : (
          <DataTable
            headers={["Query", "Clicks", "Impressions", "CTR", "Position"]}
            align={["l", "r", "r", "r", "r"]}
            rows={(gsc?.queries ?? []).map((q) => [
              q.key,
              fmtNum(q.clicks),
              fmtNum(q.impressions),
              fmtPct(q.ctr),
              q.position.toFixed(1),
            ])}
          />
        )}
      </Panel>
    </div>
  );
}
