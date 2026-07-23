"use client";

/**
 * Geography — visitor distribution on a world map (bubbles double as the
 * location heatmap; coordinates are 0.1°-binned server-side), plus
 * country-wise and city-wise visitor counts.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Panel,
  RangePicker,
  StatCard,
} from "@/components/admin/ui";
import { fmtFlag, fmtNum, useAdminData } from "@/components/admin/useAdminData";

// The map ships ~65KB of outline data — keep it out of the shared bundle
// and only load it in the browser when this page renders.
const WorldMap = dynamic(() => import("@/components/admin/WorldMap"), {
  ssr: false,
  loading: () => <LoadingPanel />,
});

interface GeoData {
  configured: boolean;
  countries: { country: string; visitors: number; events: number }[];
  cities: { city: string; country: string; region: string; visitors: number }[];
  points: { lat: number; lon: number; visitors: number }[];
}

export default function AdminGeoPage() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminData<GeoData>(
    `/api/admin/stats?section=geo&days=${days}`
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!data) return null;

  const totalVisitors = data.countries.reduce((s, c) => s + c.visitors, 0);
  const maxCountry = Math.max(1, ...data.countries.map((c) => c.visitors));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Geography</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="geo" days={days} />
          <RangePicker days={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Countries" value={fmtNum(data.countries.length)} accent="accent" sub={`${days} days`} />
        <StatCard label="Cities" value={fmtNum(data.cities.length)} />
        <StatCard label="Mapped locations" value={fmtNum(data.points.length)} />
        <StatCard
          label="Top country"
          value={
            data.countries[0]
              ? `${fmtFlag(data.countries[0].country)} ${data.countries[0].country}`
              : "—"
          }
          sub={data.countries[0] ? `${fmtNum(data.countries[0].visitors)} visitors` : undefined}
        />
      </div>

      <Panel title="Visitor locations">
        {data.points.length > 0 ? (
          <WorldMap points={data.points} />
        ) : (
          <p className="font-mono text-xs text-[var(--text-3)] py-8 text-center">
            No location data yet — geo headers populate on Vercel deployments.
          </p>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title={`Countries (${data.countries.length})`}>
          {data.countries.length === 0 ? (
            <p className="font-mono text-xs text-[var(--text-3)] py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-2">
              {data.countries.map((c) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[var(--text)] w-14 shrink-0">
                    {fmtFlag(c.country)} {c.country}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--surface2)]">
                    <div
                      className="h-full bg-[var(--accent)] opacity-80"
                      style={{ width: `${(c.visitors / maxCountry) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[var(--text-2)] w-20 text-right shrink-0">
                    {fmtNum(c.visitors)}
                    {totalVisitors > 0 && (
                      <span className="text-[var(--text-3)]">
                        {" "}
                        · {Math.round((c.visitors / totalVisitors) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Cities (top ${data.cities.length})`}>
          <DataTable
            headers={["City", "Region", "Country", "Visitors"]}
            align={["l", "l", "l", "r"]}
            rows={data.cities.map((c) => [
              c.city,
              c.region,
              `${fmtFlag(c.country)} ${c.country}`,
              c.visitors,
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
