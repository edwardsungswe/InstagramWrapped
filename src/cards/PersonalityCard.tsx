import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { PersonalityTypeResult } from "@/modules/personalityType";
import { RadarPersonality } from "@/viz/RadarPersonality";

export const PersonalityCard = forwardRef<HTMLDivElement, { card: Card }>(
  function PersonalityCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as PersonalityTypeResult;

    const radarData = [
      { name: "Social", value: data.axes.social },
      { name: "Lurker", value: data.axes.lurker },
      { name: "Creator", value: data.axes.creator },
      { name: "Explorer", value: data.axes.explorer },
    ];

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            You are a
          </p>
          <h1 className="mt-3 text-5xl font-black leading-none">
            {data.label}
          </h1>
        </div>

        <p className="mt-4 text-base leading-snug opacity-90">
          {data.description}
        </p>

        <div className="mt-auto flex justify-center">
          <RadarPersonality axes={radarData} size={280} />
        </div>
      </StoryCard>
    );
  },
);
