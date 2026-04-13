import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { DeviceLocationsResult } from "@/modules/deviceLocations";

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

function prettyMonth(label: string | undefined): string {
  if (!label) return "";
  const [yearStr, monthStr] = label.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return label;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export const DeviceLocationsCard = forwardRef<HTMLDivElement, { card: Card }>(
  function DeviceLocationsCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as DeviceLocationsResult;

    const headline =
      data.distinctDevices > 0
        ? `You logged in from ${data.distinctDevices} ${data.distinctDevices === 1 ? "device" : "devices"}.`
        : `You logged in ${data.totalLoginEvents.toLocaleString()} times.`;

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Where you log in
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
          <p className="mt-2 text-sm opacity-70">
            {data.totalLoginEvents.toLocaleString()} total login events
          </p>
        </div>

        <div className="mt-auto space-y-4 text-sm">
          {data.topUserAgent && (
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70">
                Most-used browser
              </p>
              <p className="text-xl font-semibold">{data.topUserAgent.name}</p>
              <p className="text-xs opacity-70">
                {data.topUserAgent.count.toLocaleString()} sessions
              </p>
            </div>
          )}

          {data.busiestMonth && (
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70">
                Busiest month
              </p>
              <p className="text-xl font-semibold">
                {prettyMonth(data.busiestMonth.label)}
              </p>
              <p className="text-xs opacity-70">
                {data.busiestMonth.count.toLocaleString()} logins
              </p>
            </div>
          )}

          {data.distinctUserAgents > 1 && (
            <div className="text-xs opacity-60">
              {data.distinctUserAgents} different browsers in total
            </div>
          )}
        </div>
      </StoryCard>
    );
  },
);
