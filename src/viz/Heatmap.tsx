/**
 * GitHub-contributions-style heatmap.
 *
 * - Discrete 5-bucket color scale (transparent → 5 white opacities)
 * - Vertical orientation by default (7 columns wide × N week-rows tall) so
 *   the chart fits the 9:16 portrait card layout. Pass `direction="horizontal"`
 *   for the standard GitHub layout.
 * - Pure SVG, no Recharts, no DOM measurement — works in jsdom render tests
 *   and in `html-to-image` snapshots.
 *
 * Days are bucketed by UTC. Empty days inside the active range render as
 * faint background squares so the calendar shape is recognizable even on
 * low-activity weeks.
 */

export type HeatmapDay = { day: string; count: number };

export type HeatmapProps = {
  days: HeatmapDay[];
  maxCount: number;
  direction?: "horizontal" | "vertical";
  cellSize?: number;
  gap?: number;
  /** Optional explicit start. Defaults to the earliest day in `days`. */
  startDay?: string;
  /** Optional explicit end. Defaults to the latest day in `days`. */
  endDay?: string;
};

const DAY_MS = 86_400_000;

export function Heatmap({
  days,
  maxCount,
  direction = "vertical",
  cellSize = 10,
  gap = 2,
  startDay,
  endDay,
}: HeatmapProps) {
  if (days.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const d of days) counts.set(d.day, d.count);

  const sorted = [...days].sort((a, b) => (a.day < b.day ? -1 : 1));
  const start = startDay ?? sorted[0].day;
  const end = endDay ?? sorted[sorted.length - 1].day;

  const startMs = parseDay(start);
  const endMs = parseDay(end);
  if (startMs > endMs) return null;

  // Snap start to the previous Sunday so columns line up by day-of-week.
  const startDate = new Date(startMs);
  const dowOffset = startDate.getUTCDay();
  const gridStartMs = startMs - dowOffset * DAY_MS;
  const totalDays = Math.floor((endMs - gridStartMs) / DAY_MS) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);

  const stride = cellSize + gap;

  const cells: Array<{
    x: number;
    y: number;
    bucket: number;
    day: string;
  }> = [];

  for (let i = 0; i < totalDays; i++) {
    const dayMs = gridStartMs + i * DAY_MS;
    if (dayMs < startMs) continue;
    if (dayMs > endMs) continue;
    const day = formatDay(dayMs);
    const count = counts.get(day) ?? 0;
    const week = Math.floor(i / 7);
    const dow = i % 7;
    const x = direction === "vertical" ? dow * stride : week * stride;
    const y = direction === "vertical" ? week * stride : dow * stride;
    cells.push({ x, y, bucket: bucketize(count, maxCount), day });
  }

  const widthCells = direction === "vertical" ? 7 : totalWeeks;
  const heightCells = direction === "vertical" ? totalWeeks : 7;

  return (
    <svg
      width={widthCells * stride - gap}
      height={heightCells * stride - gap}
      role="img"
      aria-label="Activity heatmap"
    >
      {cells.map((c) => (
        <rect
          key={c.day}
          x={c.x}
          y={c.y}
          width={cellSize}
          height={cellSize}
          rx={1.5}
          fill="white"
          fillOpacity={BUCKET_OPACITY[c.bucket]}
        />
      ))}
    </svg>
  );
}

const BUCKET_OPACITY = [0.08, 0.25, 0.45, 0.65, 0.85, 1.0];

function bucketize(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

function parseDay(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime();
}

function formatDay(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
