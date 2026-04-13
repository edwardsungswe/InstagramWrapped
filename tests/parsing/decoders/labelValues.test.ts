import { describe, it, expect } from "vitest";
import {
  asLabelValuesArray,
  extractOwnerHandle,
  extractUrl,
  extractVecValues,
  findLabel,
  type LabelValuesItem,
} from "@/parsing/decoders/labelValues";

const SAMPLE_ITEM: LabelValuesItem = {
  timestamp: 1750014910,
  fbid: "abc123",
  media: [],
  label_values: [
    {
      label: "URL",
      value: "https://www.instagram.com/p/Cabc/",
      href: "https://www.instagram.com/p/Cabc/",
    },
    {
      title: "Owner",
      dict: [
        {
          title: "",
          dict: [
            { label: "URL", value: "" },
            { label: "Name", value: "Some User" },
            { label: "Username", value: "afterhoursmelody" },
          ],
        },
      ],
    },
  ],
};

describe("asLabelValuesArray", () => {
  it("passes through a top-level array unchanged", () => {
    expect(asLabelValuesArray([SAMPLE_ITEM])).toEqual([SAMPLE_ITEM]);
  });

  it("extracts the first array value from an object wrapper", () => {
    expect(asLabelValuesArray({ items: [SAMPLE_ITEM] })).toEqual([SAMPLE_ITEM]);
  });

  it("returns empty array for unsupported shapes", () => {
    expect(asLabelValuesArray(null)).toEqual([]);
    expect(asLabelValuesArray("string")).toEqual([]);
    expect(asLabelValuesArray({ no: "arrays here" })).toEqual([]);
  });
});

describe("findLabel", () => {
  it("finds a top-level label", () => {
    expect(findLabel(SAMPLE_ITEM.label_values, "URL")).toBe(
      "https://www.instagram.com/p/Cabc/",
    );
  });

  it("recurses into nested dicts", () => {
    expect(findLabel(SAMPLE_ITEM.label_values, "Username")).toBe(
      "afterhoursmelody",
    );
  });

  it("returns undefined when nothing matches", () => {
    expect(findLabel(SAMPLE_ITEM.label_values, "Nonexistent")).toBeUndefined();
  });

  it("returns undefined for missing input", () => {
    expect(findLabel(undefined, "URL")).toBeUndefined();
  });
});

describe("extractOwnerHandle", () => {
  it("returns the Username from the Owner block", () => {
    expect(extractOwnerHandle(SAMPLE_ITEM)).toBe("afterhoursmelody");
  });

  it("returns undefined when there is no Owner block", () => {
    const noOwner: LabelValuesItem = {
      label_values: [{ label: "URL", value: "x" }],
    };
    expect(extractOwnerHandle(noOwner)).toBeUndefined();
  });
});

describe("extractUrl", () => {
  it("returns the top-level URL", () => {
    expect(extractUrl(SAMPLE_ITEM)).toBe("https://www.instagram.com/p/Cabc/");
  });

  it("ignores the empty Owner.URL when there is a real top-level URL", () => {
    expect(extractUrl(SAMPLE_ITEM)).toBe("https://www.instagram.com/p/Cabc/");
  });

  it("returns undefined when no URL labels exist", () => {
    const noUrl: LabelValuesItem = {
      label_values: [{ label: "Other", value: "x" }],
    };
    expect(extractUrl(noUrl)).toBeUndefined();
  });
});

describe("extractVecValues", () => {
  it("collects values from a vec array", () => {
    const item: LabelValuesItem = {
      label_values: [
        {
          label: "Categories",
          vec: [{ value: "Lifestyle" }, { value: "Travel" }, { value: "" }],
        },
      ],
    };
    expect(extractVecValues(item, "Categories")).toEqual([
      "Lifestyle",
      "Travel",
    ]);
  });

  it("returns empty when the label or vec is missing", () => {
    const item: LabelValuesItem = {
      label_values: [{ label: "Other", value: "x" }],
    };
    expect(extractVecValues(item, "Nope")).toEqual([]);
  });
});
