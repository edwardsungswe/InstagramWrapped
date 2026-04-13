import { forwardRef } from "react";
import { StoryCard } from "./StoryCard";
import type { Card } from "./types";
import type { TopPeopleResult } from "@/modules/topPeople";
import {
  NetworkGraph,
  type NetworkEdge,
  type NetworkNode,
} from "@/viz/NetworkGraph";

const GRAPH_NODES = 8;
const LIST_ITEMS = 5;

/**
 * The most-shareable card. Picks a personalized headline based on whether
 * the top entry has a runaway lead or it's a tight pack.
 */
function pickHeadline(data: TopPeopleResult): string {
  const top = data.people[0];
  if (!top) return "Your top people";
  const second = data.people[1];

  if (second && top.score > second.score * 2) {
    return `You and @${top.handle} are inseparable.`;
  }
  if (!second) {
    return `You and @${top.handle} are inseparable.`;
  }
  return "These are your people.";
}

function buildGraph(
  data: TopPeopleResult,
  ownerLabel: string,
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const top = data.people.slice(0, GRAPH_NODES);
  const nodes: NetworkNode[] = [
    { id: "owner", label: ownerLabel, weight: 0, isCenter: true },
    ...top.map((p) => ({ id: p.handle, label: p.handle, weight: p.score })),
  ];
  const edges: NetworkEdge[] = top.map((p) => ({
    source: "owner",
    target: p.handle,
    weight: p.score,
  }));
  return { nodes, edges };
}

export const TopPeopleCard = forwardRef<HTMLDivElement, { card: Card }>(
  function TopPeopleCard({ card }, ref) {
    if (card.run.result.status !== "ok") return null;
    const data = card.run.result.data as TopPeopleResult;
    const top = data.people.slice(0, LIST_ITEMS);
    const { nodes, edges } = buildGraph(data, "you");

    return (
      <StoryCard ref={ref} bg={card.bg}>
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">
            Your top people
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">
            {pickHeadline(data)}
          </h1>
        </div>

        <div className="mt-4 flex justify-center">
          <NetworkGraph nodes={nodes} edges={edges} width={300} height={300} />
        </div>

        <ol className="mt-auto space-y-1 text-base font-semibold">
          {top.map((p, i) => (
            <li key={p.handle} className="flex items-baseline gap-3">
              <span className="w-5 text-right text-xs font-normal opacity-50">
                {i + 1}
              </span>
              <span className="truncate">@{p.handle}</span>
            </li>
          ))}
        </ol>
      </StoryCard>
    );
  },
);
