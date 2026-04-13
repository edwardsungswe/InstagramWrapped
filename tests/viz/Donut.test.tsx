import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Donut } from "@/viz/Donut";

describe("Donut", () => {
  it("renders a Recharts pie SVG", () => {
    const { container } = render(
      <Donut
        data={[
          { name: "Memes", value: 50 },
          { name: "Fitness", value: 30 },
          { name: "Food", value: 20 },
        ]}
      />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    // Recharts renders one <path> per slice.
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it("renders center label and subtext", () => {
    const { container } = render(
      <Donut
        data={[{ name: "x", value: 1 }]}
        centerLabel="Memes"
        centerSubtext="50 accounts"
      />,
    );
    expect(container.textContent).toContain("Memes");
    expect(container.textContent).toContain("50 accounts");
  });

  it("does not render label container when no center text passed", () => {
    const { container } = render(
      <Donut data={[{ name: "x", value: 1 }]} />,
    );
    // No flex container with the labels.
    expect(container.querySelector(".pointer-events-none")).toBeNull();
  });
});
