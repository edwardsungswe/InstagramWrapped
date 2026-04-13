"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

/**
 * Horizontal bar chart wrapper around Recharts `BarChart`.
 *
 * - **Explicit pixel sizing** (no `ResponsiveContainer`) so the chart works
 *   in jsdom render tests and `html-to-image` snapshots.
 * - White-on-transparent palette so it inherits the card's background.
 * - Used by `AdPersonalityCard` to show the group breakdown.
 */

export type BarRow = { label: string; value: number };

export type BarsProps = {
  data: BarRow[];
  width?: number;
  height?: number;
};

export function Bars({ data, width = 320, height = 200 }: BarsProps) {
  // Recharts wants the X axis on the value direction for horizontal layout.
  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      layout="vertical"
      margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
    >
      <XAxis type="number" hide />
      <YAxis
        type="category"
        dataKey="label"
        axisLine={false}
        tickLine={false}
        tick={{ fill: "white", fontSize: 12 }}
        width={90}
      />
      <Bar
        dataKey="value"
        fill="white"
        fillOpacity={0.85}
        radius={[2, 2, 2, 2]}
        isAnimationActive={false}
      />
    </BarChart>
  );
}
