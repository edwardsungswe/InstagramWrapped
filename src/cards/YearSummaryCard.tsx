import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { YearSummaryResult } from "@/modules/yearSummary";

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

/** Converts "2024-11" → "November 2024". */
function prettyMonth(label: string): string {
  const [yearStr, monthStr] = label.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return label;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Converts "2024-06-15" → "June 15". */
function prettyDay(date: string): string {
  const [, monthStr, dayStr] = date.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return date;
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

export const YearSummaryCard = forwardRef<HTMLDivElement, { card: Card }>(
  function YearSummaryCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as YearSummaryResult;

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Your Wrapped
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-none">
            You showed up
          </h1>
          <p className="mt-3 text-7xl font-black tracking-tight">
            {data.totalInteractions.toLocaleString()}
          </p>
          <p className="mt-3 text-2xl font-medium">times.</p>
        </div>

        <div className="mt-auto space-y-4 text-sm">
          {data.mostActiveMonth && (
            <p className="leading-snug">
              <span className="block opacity-70">Main character era</span>
              <span className="text-xl font-semibold">
                {prettyMonth(data.mostActiveMonth.label)}
              </span>
            </p>
          )}
          {data.peakDay && (
            <p className="leading-snug">
              <span className="block opacity-70">Peak day</span>
              <span className="text-xl font-semibold">
                {prettyDay(data.peakDay.date)} ·{" "}
                {data.peakDay.count.toLocaleString()} interactions
              </span>
            </p>
          )}
          {data.longestDmStreak.days > 0 && (
            <p className="leading-snug">
              <span className="block opacity-70">Longest DM streak</span>
              <span className="text-xl font-semibold">
                {data.longestDmStreak.days} days in a row
              </span>
            </p>
          )}
        </div>
      </StoryCard>
    );
  },
);
