import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { ContentCategoriesResult } from "@/modules/contentCategories";
import { Donut } from "@/viz/Donut";

export const ContentCategoriesCard = forwardRef<HTMLDivElement, { card: Card }>(
  function ContentCategoriesCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as ContentCategoriesResult;
    const top = data.categories[0];
    const headline = top
      ? `You're really into ${top.name.toLowerCase()}.`
      : "Your taste is its own thing.";

    const donutData = data.categories.map((c) => ({
      name: c.name,
      value: c.count,
    }));

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Content categories
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
        </div>

        <div className="mt-6 flex justify-center">
          <Donut
            data={donutData}
            size={220}
            centerLabel={top?.name}
            centerSubtext={top ? `${top.count} accounts` : undefined}
          />
        </div>

        <ul className="mt-auto space-y-1 text-sm">
          {data.categories.slice(0, 4).map((c) => (
            <li
              key={c.name}
              className="flex items-baseline justify-between border-b border-white/10 pb-1"
            >
              <span className="font-semibold">{c.name}</span>
              <span className="font-mono opacity-70">{c.count}</span>
            </li>
          ))}
        </ul>

        {data.uncategorizedCount > 0 && (
          <p className="mt-2 text-xs opacity-50">
            +{data.uncategorizedCount} accounts we couldn&apos;t bucket
          </p>
        )}
      </StoryCard>
    );
  },
);
