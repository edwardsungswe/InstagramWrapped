import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { RelationshipInsightsResult } from "@/modules/relationshipInsights";

export const RelationshipInsightsCard = forwardRef<HTMLDivElement, { card: Card }>(
  function RelationshipInsightsCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as RelationshipInsightsResult;
    const oneSided = data.oneSided[0];
    const situationship = data.situationships[0];

    const headline =
      oneSided && situationship
        ? "Your relationship report card."
        : oneSided
          ? "These friendships are a little one-sided."
          : situationship
            ? "Late-night Sarah."
            : "Your relationships look solid.";

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Relationship insights
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
        </div>

        <div className="mt-auto space-y-6 text-sm">
          {data.oneSided.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider opacity-70">
                You text them more than they text back
              </p>
              <ul className="space-y-1">
                {data.oneSided.map((row) => (
                  <li
                    key={row.handle}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-lg font-semibold">@{row.handle}</span>
                    <span className="text-xs opacity-70">
                      {Math.round((row.sent / Math.max(row.received, 1)) * 10) / 10}× more
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.situationships.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider opacity-70">
                Late-night specials
              </p>
              <ul className="space-y-1">
                {data.situationships.map((row) => (
                  <li
                    key={row.handle}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-lg font-semibold">@{row.handle}</span>
                    <span className="text-xs opacity-70">
                      {Math.round(row.nightFraction * 100)}% after dark
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </StoryCard>
    );
  },
);
