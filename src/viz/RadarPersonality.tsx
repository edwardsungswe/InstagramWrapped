"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

/**
 * 4-axis radar chart for the personality module.
 *
 * - **Explicit pixel sizing** (no `ResponsiveContainer`).
 * - White-on-transparent palette so it inherits the card's background.
 * - Domain locked to 0–100 so the polygon shape reflects absolute scores
 *   rather than auto-fitting to whatever max happens to land.
 * - Axis labels are short ("Social", "Lurker", etc.) so they fit at the
 *   four corners without truncation.
 */

export type RadarAxis = { name: string; value: number };

export type RadarPersonalityProps = {
  axes: RadarAxis[];
  size?: number;
};

export function RadarPersonality({ axes, size = 280 }: RadarPersonalityProps) {
  return (
    <RadarChart
      width={size}
      height={size}
      data={axes}
      cx="50%"
      cy="50%"
      outerRadius="75%"
    >
      <PolarGrid stroke="white" strokeOpacity={0.3} />
      <PolarAngleAxis
        dataKey="name"
        tick={{ fill: "white", fontSize: 12 }}
        stroke="rgba(255,255,255,0.4)"
      />
      <PolarRadiusAxis
        domain={[0, 100]}
        axisLine={false}
        tick={false}
        stroke="rgba(255,255,255,0.2)"
      />
      <Radar
        dataKey="value"
        stroke="white"
        fill="white"
        fillOpacity={0.5}
        isAnimationActive={false}
      />
    </RadarChart>
  );
}
