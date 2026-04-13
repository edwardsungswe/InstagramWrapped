"use client";

import { Cell, Pie, PieChart } from "recharts";

/**
 * Donut chart wrapper around Recharts `PieChart`.
 *
 * - **Explicit pixel sizing** (no `ResponsiveContainer`) so the chart works
 *   in jsdom render tests and `html-to-image` snapshots.
 * - 5-color palette baked in. Slices beyond 5 are gray-ish.
 * - Optional center label + subtext rendered as overlaid HTML so the radar
 *   chart's slice geometry doesn't have to leave room for it.
 */

export type DonutSlice = { name: string; value: number };

export type DonutProps = {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerSubtext?: string;
};

const COLORS = [
  "#ffffff",
  "rgba(255,255,255,0.75)",
  "rgba(255,255,255,0.55)",
  "rgba(255,255,255,0.4)",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.15)",
];

export function Donut({
  data,
  size = 220,
  centerLabel,
  centerSubtext,
}: DonutProps) {
  const innerRadius = Math.round(size * 0.32);
  const outerRadius = Math.round(size * 0.48);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          stroke="none"
          isAnimationActive={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
      {(centerLabel || centerSubtext) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel && (
            <div className="text-lg font-bold leading-none">{centerLabel}</div>
          )}
          {centerSubtext && (
            <div className="mt-1 text-xs opacity-70">{centerSubtext}</div>
          )}
        </div>
      )}
    </div>
  );
}
