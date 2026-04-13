/**
 * Visualization library — reusable chart components consumed by the cards.
 *
 * Every component:
 *   - takes explicit pixel dimensions (no `ResponsiveContainer`)
 *   - has `isAnimationActive={false}` so jsdom render tests + html-to-image
 *     snapshots are deterministic
 *   - inherits its color from the parent card via white-on-transparent
 *     palettes
 */

export { Heatmap } from "./Heatmap";
export type { HeatmapProps, HeatmapDay } from "./Heatmap";

export { Donut } from "./Donut";
export type { DonutProps, DonutSlice } from "./Donut";

export { Bars } from "./Bars";
export type { BarsProps, BarRow } from "./Bars";

export { RadarPersonality } from "./RadarPersonality";
export type { RadarPersonalityProps, RadarAxis } from "./RadarPersonality";

export { NetworkGraph } from "./NetworkGraph";
export type {
  NetworkGraphProps,
  NetworkNode,
  NetworkEdge,
} from "./NetworkGraph";

export { Timeline } from "./Timeline";
export type { TimelineProps, TimelineEvent } from "./Timeline";
