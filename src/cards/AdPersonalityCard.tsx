import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { AdPersonalityResult } from "@/modules/adPersonality";
import { Bars } from "@/viz/Bars";

export const AdPersonalityCard = forwardRef<HTMLDivElement, { card: Card }>(
  function AdPersonalityCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as AdPersonalityResult;

    const headline = data.embarrassing
      ? `Instagram thinks you're "${data.embarrassing}".`
      : data.topGroup
        ? `Instagram has you pegged as ${data.topGroup.toLowerCase()}.`
        : "Instagram has no idea who you are.";

    const barData = Object.entries(data.groupCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Ad personality
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">{headline}</h1>
          {data.embarrassing && (
            <p className="mt-2 text-sm opacity-70">
              We don&apos;t know what that means either.
            </p>
          )}
        </div>

        <div className="mt-auto flex justify-center">
          <Bars data={barData} width={320} height={200} />
        </div>

        <p className="mt-3 text-center text-xs opacity-50">
          {data.total.toLocaleString()} categories total
        </p>
      </StoryCard>
    );
  },
);
