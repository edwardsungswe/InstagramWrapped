import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { ActivityHeatmapResult, HeatmapDay } from "@/modules/activityHeatmap";
import { Heatmap } from "@/viz/Heatmap";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MAX_DAYS_IN_CARD = 365;

function prettyDate(date: string): string {
  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return date;
  }
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Caps the heatmap to the most recent ~365 days for the card view so the
 * vertical grid stays a manageable height. The standalone Heatmap component
 * handles arbitrary ranges; this is a card-level decision.
 */
function cropToRecent(days: HeatmapDay[]): HeatmapDay[] {
  if (days.length <= MAX_DAYS_IN_CARD) return days;
  // Days are already sorted oldest → newest by the activityHeatmap module.
  return days.slice(-MAX_DAYS_IN_CARD);
}

export const HeatmapCard = forwardRef<HTMLDivElement, { card: Card }>(
  function HeatmapCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as ActivityHeatmapResult;
    const cropped = cropToRecent(data.days);
    const peakDay = data.days.find((d) => d.count === data.maxCount)?.day ?? data.endDay;

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            You showed up
          </p>
          <p className="mt-3 text-7xl font-black leading-none">
            {data.activeDayCount.toLocaleString()}
          </p>
          <p className="mt-2 text-2xl font-medium">days.</p>
        </div>

        <div className="mt-6 flex justify-center">
          <Heatmap
            days={cropped}
            maxCount={data.maxCount}
            direction="vertical"
            cellSize={11}
            gap={3}
          />
        </div>

        <div className="mt-auto space-y-3 text-sm">
          {peakDay && (
            <p className="leading-snug">
              <span className="block opacity-70">Peak day</span>
              <span className="text-xl font-semibold">
                {prettyDate(peakDay)} · {data.maxCount.toLocaleString()} interactions
              </span>
            </p>
          )}
        </div>
      </StoryCard>
    );
  },
);
