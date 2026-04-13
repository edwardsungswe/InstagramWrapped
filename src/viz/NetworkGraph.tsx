"use client";

import { useMemo } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

/**
 * Force-directed network graph for the top-people card.
 *
 * - Runs `forceSimulation` synchronously with `tick(150)` on first render
 *   inside `useMemo`, captures final positions, renders static SVG.
 * - **No animation, no requestAnimationFrame** → works in jsdom render
 *   tests and `html-to-image` snapshots.
 * - Deterministic: identical inputs produce identical positions because we
 *   seed the initial node positions ourselves and the simulation has no
 *   external clock dependency once `stop()` is called.
 *
 * Visual: a center "you" node surrounded by outer nodes (top people),
 * connected by edges weighted by interaction strength.
 */

export type NetworkNode = {
  id: string;
  label: string;
  weight: number;
  isCenter?: boolean;
};

export type NetworkEdge = {
  source: string;
  target: string;
  weight: number;
};

export type NetworkGraphProps = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  width?: number;
  height?: number;
};

type SimNode = NetworkNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { weight: number };

export function NetworkGraph({
  nodes,
  edges,
  width = 320,
  height = 320,
}: NetworkGraphProps) {
  const layout = useMemo(
    () => computeLayout(nodes, edges, width, height),
    [nodes, edges, width, height],
  );

  return (
    <svg width={width} height={height} role="img" aria-label="Top people network">
      {layout.links.map((l, i) => {
        const source = l.source as SimNode;
        const target = l.target as SimNode;
        return (
          <line
            key={i}
            x1={source.x ?? 0}
            y1={source.y ?? 0}
            x2={target.x ?? 0}
            y2={target.y ?? 0}
            stroke="white"
            strokeOpacity={0.45}
            strokeWidth={Math.max(1, Math.sqrt(l.weight) * 0.4)}
          />
        );
      })}
      {layout.nodes.map((n) => {
        const r = n.isCenter ? 22 : Math.max(8, Math.min(18, 8 + n.weight / 80));
        return (
          <g key={n.id} transform={`translate(${n.x ?? 0},${n.y ?? 0})`}>
            <circle
              r={r}
              fill="white"
              fillOpacity={n.isCenter ? 1 : 0.85}
              stroke="white"
              strokeOpacity={0.6}
            />
            <text
              y={n.isCenter ? 4 : r + 11}
              textAnchor="middle"
              fontSize={n.isCenter ? 10 : 9}
              fill={n.isCenter ? "black" : "white"}
              style={{ pointerEvents: "none" }}
            >
              {n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Runs the d3 force simulation synchronously and returns final positions.
 * The initial positions are seeded deterministically (round-robin around a
 * circle) so two renders with the same input always produce the same final
 * layout.
 */
function computeLayout(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
): { nodes: SimNode[]; links: SimLink[] } {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const simNodes: SimNode[] = nodes.map((n, i) => {
    if (n.isCenter) {
      return { ...n, x: cx, y: cy };
    }
    const angle = (i / Math.max(1, nodes.length - 1)) * Math.PI * 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  const simLinks: SimLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    weight: e.weight,
  }));

  const sim = forceSimulation(simNodes)
    .force("charge", forceManyBody().strength(-220))
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(70)
        .strength(0.5),
    )
    .force("center", forceCenter(cx, cy))
    .force("collide", forceCollide(24))
    .stop();

  sim.tick(150);

  return { nodes: simNodes, links: simLinks };
}
