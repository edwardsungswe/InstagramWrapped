import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RadarPersonality } from "@/viz/RadarPersonality";

describe("RadarPersonality", () => {
  it("renders a Recharts SVG with 4 axis labels", () => {
    const { container } = render(
      <RadarPersonality
        axes={[
          { name: "Social", value: 60 },
          { name: "Lurker", value: 25 },
          { name: "Creator", value: 0 },
          { name: "Explorer", value: 15 },
        ]}
      />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toContain("Social");
    expect(container.textContent).toContain("Lurker");
    expect(container.textContent).toContain("Creator");
    expect(container.textContent).toContain("Explorer");
  });

  it("renders the radar polygon path", () => {
    const { container } = render(
      <RadarPersonality
        axes={[
          { name: "Social", value: 60 },
          { name: "Lurker", value: 25 },
          { name: "Creator", value: 0 },
          { name: "Explorer", value: 15 },
        ]}
      />,
    );
    // Recharts emits a Radar polygon as a path inside the radar group.
    const radar = container.querySelector(".recharts-radar-polygon");
    expect(radar).not.toBeNull();
  });
});
