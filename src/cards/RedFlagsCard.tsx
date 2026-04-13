import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { RedFlagsResult } from "@/modules/redFlags";

export const RedFlagsCard = forwardRef<HTMLDivElement, { card: Card }>(
  function RedFlagsCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as RedFlagsResult;

    const headline =
      data.flags.length === 1
        ? "We saw that. 🚩"
        : `${data.flags.length} red flags. We saw that.`;

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Red flags
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">{headline}</h1>
        </div>

        <ul className="mt-auto space-y-4">
          {data.flags.map((flag) => (
            <li key={flag.id}>
              <p className="text-lg font-semibold">🚩 {flag.label}</p>
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
