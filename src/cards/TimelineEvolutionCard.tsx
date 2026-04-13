import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type {
  Milestone,
  TimelineEvolutionResult,
} from "@/modules/timelineEvolution";
import { Timeline, type TimelineEvent } from "@/viz/Timeline";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatTimeLabel(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function labelForMilestone(m: Milestone): string {
  switch (m.field) {
    case "Username":
      return m.to ? `Became @${m.to}` : "Changed username";
    case "Profile Bio Text":
    case "Bio":
      return "Updated bio";
    case "Profile Photo":
      return "New profile photo";
    case "Name":
      return m.to ? `Now goes by ${m.to}` : "Changed display name";
    default:
      return `Updated ${m.field}`;
  }
}

function detailForMilestone(m: Milestone): string | undefined {
  if (m.field === "Username" && m.from && m.to) return `${m.from} → ${m.to}`;
  if (m.field === "Profile Bio Text" && m.to)
    return m.to.length > 60 ? `${m.to.slice(0, 57)}…` : m.to;
  return undefined;
}

const MAX_TIMELINE_EVENTS = 6;

function pickHeadline(data: TimelineEvolutionResult): string {
  if (data.peakYear) {
    return `${data.peakYear.year} was your peak.`;
  }
  if (data.milestones.length > 0) {
    return "Your evolution.";
  }
  return "Your evolution.";
}

export const TimelineEvolutionCard = forwardRef<HTMLDivElement, { card: Card }>(
  function TimelineEvolutionCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as TimelineEvolutionResult;

    // Show the most recent N milestones — older ones get truncated.
    const events: TimelineEvent[] = data.milestones
      .slice(-MAX_TIMELINE_EVENTS)
      .map((m, idx) => ({
        id: `${m.ts}-${idx}`,
        label: labelForMilestone(m),
        detail: detailForMilestone(m),
        timeLabel: formatTimeLabel(m.ts),
      }));

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Your evolution
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            {pickHeadline(data)}
          </h1>
          {data.peakYear && (
            <p className="mt-2 text-sm opacity-80">
              {data.peakYear.count.toLocaleString()} posts that year ·{" "}
              {data.totalPosts.toLocaleString()} all time
            </p>
          )}
        </div>

        <div className="mt-6 flex-1 overflow-hidden">
          <Timeline events={events} />
        </div>
      </StoryCard>
    );
  },
);
