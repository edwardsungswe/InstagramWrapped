import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { GreenFlagsResult } from "@/modules/greenFlags";

export const GreenFlagsCard = forwardRef<HTMLDivElement, { card: Card }>(
  function GreenFlagsCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as GreenFlagsResult;

    const headline =
      data.flags.length === 1
        ? "Caught you being normal. 🌱"
        : `${data.flags.length} green flags. Keep it up.`;

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Green flags
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
        </div>

        <ul className="mt-auto space-y-4">
          {data.flags.map((flag) => (
            <li key={flag.id}>
              <p className="text-lg font-semibold">🌱 {flag.label}</p>
              {flag.detail && (
                <p className="mt-1 text-sm opacity-70">{flag.detail}</p>
              )}
            </li>
          ))}
        </ul>
      </StoryCard>
    );
  },
);
