import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "@/viz/Heatmap";

describe("Heatmap — empty input", () => {
  it("renders nothing when days are empty", () => {
    const { container } = render(<Heatmap days={[]} maxCount={0} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("Heatmap — cell count", () => {
  it("renders one rect for every day in the range", () => {
    // 2024-06-15 → 2024-06-21 = 7 days
    const days = Array.from({ length: 7 }, (_, i) => ({
      day: `2024-06-${String(15 + i).padStart(2, "0")}`,
      count: i,
    }));
    const { container } = render(<Heatmap days={days} maxCount={6} />);
    const rects = container.querySelectorAll("rect");
    // 7 days, but we may also get padding cells in the snapped week — check ≥ 7
    expect(rects.length).toBeGreaterThanOrEqual(7);
    expect(rects.length).toBeLessThanOrEqual(7);
  });
});

describe("Heatmap — bucket math", () => {
  it("scales cell opacity by count relative to maxCount", () => {
    const days = [
      { day: "2024-06-15", count: 0 },
      { day: "2024-06-16", count: 5 },
      { day: "2024-06-17", count: 10 },
    ];
    const { container } = render(<Heatmap days={days} maxCount={10} />);
    const opacities = Array.from(container.querySelectorAll("rect")).map(
      (r) => Number(r.getAttribute("fill-opacity")),
    );
    // 0 → bucket 0 (0.08); 5/10 = 0.5 → bucket 3 (0.65); 10/10 = 1 → bucket 5 (1.0)
    expect(opacities[0]).toBeCloseTo(0.08);
    expect(opacities[1]).toBeCloseTo(0.65);
    expect(opacities[2]).toBeCloseTo(1.0);
  });
});

describe("Heatmap — direction", () => {
  it("vertical direction lays out 7 columns wide", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      day: `2024-06-${String(15 + i).padStart(2, "0")}`,
      count: 1,
    }));
    const { container } = render(
      <Heatmap days={days} maxCount={1} direction="vertical" cellSize={10} gap={2} />,
    );
    const svg = container.querySelector("svg")!;
    const width = Number(svg.getAttribute("width"));
    // 7 cols × (10 + 2) - 2 = 82
    expect(width).toBe(82);
  });

  it("horizontal direction lays out 7 rows tall", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      day: `2024-06-${String(15 + i).padStart(2, "0")}`,
      count: 1,
    }));
    const { container } = render(
      <Heatmap days={days} maxCount={1} direction="horizontal" cellSize={10} gap={2} />,
    );
    const svg = container.querySelector("svg")!;
    const height = Number(svg.getAttribute("height"));
    expect(height).toBe(82);
  });
});

describe("Heatmap — fills gaps", () => {
  it("renders cells for days with no activity inside the range", () => {
    // Two dates with a gap between them
    const days = [
      { day: "2024-06-15", count: 5 },
      { day: "2024-06-22", count: 5 },
    ];
    const { container } = render(<Heatmap days={days} maxCount={5} />);
    const rects = container.querySelectorAll("rect");
    // 8 cells inclusive of both dates
    expect(rects.length).toBe(8);
  });
});
