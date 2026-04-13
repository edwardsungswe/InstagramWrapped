import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Timeline } from "@/viz/Timeline";

describe("Timeline", () => {
  it("renders nothing when events are empty", () => {
    const { container } = render(<Timeline events={[]} />);
    expect(container.querySelector("ol")).toBeNull();
  });

  it("renders one list item per event", () => {
    const { container } = render(
      <Timeline
        events={[
          { id: "1", label: "Joined Instagram", timeLabel: "Mar 2018" },
          { id: "2", label: "Changed handle", timeLabel: "Jun 2019" },
          { id: "3", label: "Updated bio", timeLabel: "Jan 2024" },
        ]}
      />,
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("renders the time label, label, and detail", () => {
    const { container } = render(
      <Timeline
        events={[
          {
            id: "1",
            label: "Changed handle",
            timeLabel: "Jun 2019",
            detail: "old_name → new_name",
          },
        ]}
      />,
    );
    expect(container.textContent).toContain("Jun 2019");
    expect(container.textContent).toContain("Changed handle");
    expect(container.textContent).toContain("old_name → new_name");
  });

  it("omits detail when not provided", () => {
    const { container } = render(
      <Timeline
        events={[{ id: "1", label: "Joined", timeLabel: "Mar 2018" }]}
      />,
    );
    // The detail div is conditionally rendered; with no detail, it should be absent.
    const detailDivs = container.querySelectorAll(".text-xs.opacity-70");
    // 1 div for the timeLabel; the detail div should not exist.
    expect(detailDivs).toHaveLength(1);
  });
});
