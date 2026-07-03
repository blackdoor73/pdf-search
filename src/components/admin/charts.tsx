"use client";

/**
 * Recharts wrappers themed for the admin dashboard.
 *
 * Colors are hex constants (not CSS vars) because SVG presentation
 * attributes don't resolve var() reliably across browsers.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART = {
  accent: "#f5c542",
  green: "#4caf79",
  red: "#e05252",
  blue: "#5b9cf6",
  purple: "#a78bfa",
  grid: "#2a2a2a",
  text: "#5a5a5a",
};

const PALETTE = [CHART.accent, CHART.blue, CHART.green, CHART.purple, CHART.red, "#e8926a"];

const tooltipStyle = {
  backgroundColor: "#1f1f1f",
  border: "1px solid #383838",
  borderRadius: 0,
  fontFamily: "var(--font-mono), monospace",
  fontSize: 11,
};

const axisProps = {
  stroke: CHART.grid,
  tick: { fill: CHART.text, fontSize: 10, fontFamily: "monospace" },
  tickLine: false,
} as const;

export interface SeriesDef {
  key: string;
  label: string;
  color?: string;
}

export function TrendChart({
  data,
  xKey,
  series,
  height = 240,
  stacked = false,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#9a9a9a" }} />
        {series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
        )}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            fillOpacity={0.12}
            strokeWidth={1.5}
            stackId={stacked ? "stack" : undefined}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} minTickGap={30} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#9a9a9a" }} cursor={{ fill: "rgba(245,197,66,0.05)" }} />
        {series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
        )}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            maxBarSize={24}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal funnel bars with conversion percentages between stages. */
export function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev ? (prev > 0 ? (s.value / prev) * 100 : 0) : null;
        return (
          <div key={s.label}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-xs text-[var(--text-2)]">{s.label}</span>
              <span className="font-mono text-xs text-[var(--text)]">
                {s.value.toLocaleString()}
                {conv != null && (
                  <span
                    className={
                      conv < 30 ? "text-[var(--red)] ml-2" : "text-[var(--text-3)] ml-2"
                    }
                  >
                    {conv.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-4 bg-[var(--surface2)]">
              <div
                className="h-full transition-all"
                style={{
                  width: `${(s.value / max) * 100}%`,
                  background: PALETTE[i % PALETTE.length],
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Retention cohort heatmap grid. */
export function CohortGrid({
  cohorts,
}: {
  cohorts: { cohort: string; size: number; weeks: number[] }[];
}) {
  if (cohorts.length === 0) {
    return (
      <p className="font-mono text-xs text-[var(--text-3)] py-4 text-center">
        Not enough data for cohorts yet
      </p>
    );
  }
  const maxWeeks = Math.max(...cohorts.map((c) => c.weeks.length), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] font-normal text-left py-2 px-2">
              Cohort
            </th>
            <th className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] font-normal text-right py-2 px-2">
              Users
            </th>
            {Array.from({ length: maxWeeks }, (_, i) => (
              <th
                key={i}
                className="font-mono text-[10px] text-[var(--text-3)] font-normal text-center py-2 px-1"
              >
                W{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort}>
              <td className="font-mono text-xs text-[var(--text-2)] py-1 px-2 whitespace-nowrap">
                {c.cohort}
              </td>
              <td className="font-mono text-xs text-[var(--text)] py-1 px-2 text-right">
                {c.size}
              </td>
              {Array.from({ length: maxWeeks }, (_, i) => {
                const active = c.weeks[i];
                const pct = active != null && c.size > 0 ? active / c.size : null;
                return (
                  <td key={i} className="p-1">
                    {pct != null ? (
                      <div
                        className="h-7 min-w-11 flex items-center justify-center font-mono text-[10px]"
                        style={{
                          background: `rgba(245, 197, 66, ${Math.max(0.06, pct * 0.85)})`,
                          color: pct > 0.45 ? "#000" : "#e8e8e8",
                        }}
                        title={`${active} users (${Math.round(pct * 100)}%)`}
                      >
                        {Math.round(pct * 100)}%
                      </div>
                    ) : (
                      <div className="h-7 min-w-11" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
