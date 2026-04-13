import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NetworkGraph, type NetworkNode, type NetworkEdge } from "@/viz/NetworkGraph";

const NODES: NetworkNode[] = [
  { id: "owner", label: "you", weight: 0, isCenter: true },
  { id: "alice", label: "alice", weight: 1500 },
  { id: "bob", label: "bob", weight: 1000 },
  { id: "carol", label: "carol", weight: 800 },
];

const EDGES: NetworkEdge[] = [
  { source: "owner", target: "alice", weight: 1500 },
  { source: "owner", target: "bob", weight: 1000 },
  { source: "owner", target: "carol", weight: 800 },
];

describe("NetworkGraph — render", () => {
  it("renders one circle per node and one line per edge", () => {
    const { container } = render(<NetworkGraph nodes={NODES} edges={EDGES} />);
    const circles = container.querySelectorAll("circle");
    const lines = container.querySelectorAll("line");
    expect(circles.length).toBe(4);
    expect(lines.length).toBe(3);
  });

  it("renders node labels", () => {
    const { container } = render(<NetworkGraph nodes={NODES} edges={EDGES} />);
    expect(container.textContent).toContain("alice");
    expect(container.textContent).toContain("bob");
    expect(container.textContent).toContain("carol");
  });

  it("truncates long labels", () => {
    const { container } = render(
      <NetworkGraph
        nodes={[
          { id: "owner", label: "you", weight: 0, isCenter: true },
          { id: "x", label: "this_handle_is_way_too_long", weight: 100 },
        ]}
        edges={[{ source: "owner", target: "x", weight: 100 }]}
      />,
    );
    expect(container.textContent).toContain("…");
  });
});

describe("NetworkGraph — determinism", () => {
  it("two renders with the same input produce the same SVG", () => {
    const a = render(<NetworkGraph nodes={NODES} edges={EDGES} />);
    const b = render(<NetworkGraph nodes={NODES} edges={EDGES} />);
    expect(a.container.querySelector("svg")?.outerHTML).toBe(
      b.container.querySelector("svg")?.outerHTML,
    );
  });
});

describe("NetworkGraph — empty input", () => {
  it("renders an empty SVG when there are no nodes", () => {
    const { container } = render(<NetworkGraph nodes={[]} edges={[]} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("circle").length).toBe(0);
  });
});
