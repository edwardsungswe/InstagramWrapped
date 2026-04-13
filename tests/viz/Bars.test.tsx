import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Bars } from "@/viz/Bars";

describe("Bars", () => {
  it("renders a Recharts SVG with one bar per data row", () => {
    const { container } = render(
      <Bars
        data={[
          { label: "Tech", value: 5 },
          { label: "Lifestyle", value: 3 },
          { label: "Financial", value: 1 },
        ]}
      />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    // Each bar is a <rect> with the bar's class — Recharts emits at least
    // one rect per data row.
    const bars = container.querySelectorAll("path.recharts-rectangle");
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the labels on the y-axis", () => {
    const { container } = render(
      <Bars
        data={[
          { label: "Tech", value: 5 },
          { label: "Lifestyle", value: 3 },
        ]}
      />,
    );
    expect(container.textContent).toContain("Tech");
    expect(container.textContent).toContain("Lifestyle");
  });
});
