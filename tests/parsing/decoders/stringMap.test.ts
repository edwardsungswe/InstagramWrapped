import { describe, it, expect } from "vitest";
import {
  asStringMapArray,
  fieldTimestamp,
  fieldValue,
} from "@/parsing/decoders/stringMap";

describe("asStringMapArray — layout handling", () => {
  it("unwraps a named-array wrapper (Layout B1)", () => {
    const input = {
      relationships_following: [
        {
          title: "poongzwa",
          string_list_data: [
            { href: "https://x", value: "poongzwa", timestamp: 1756201367 },
          ],
        },
      ],
    };
    const items = asStringMapArray(input);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("poongzwa");
    expect(items[0].list[0].value).toBe("poongzwa");
    expect(items[0].list[0].timestamp).toBe(1756201367);
  });

  it("passes through a bare top-level array (Layout B2)", () => {
    const input = [
      {
        title: "",
        string_list_data: [
          { href: "https://x", value: "follower1", timestamp: 1756201377 },
        ],
      },
    ];
    const items = asStringMapArray(input);
    expect(items).toHaveLength(1);
    expect(items[0].list[0].value).toBe("follower1");
  });

  it("returns empty array on unrecognized shapes", () => {
    expect(asStringMapArray(null)).toEqual([]);
    expect(asStringMapArray("string")).toEqual([]);
    expect(asStringMapArray({ no: "arrays" })).toEqual([]);
  });
});

describe("asStringMapArray — variant normalization", () => {
  it("normalizes string_map_data into a fields record", () => {
    const items = asStringMapArray([
      {
        string_map_data: {
          Comment: { value: "fuckass cat" },
          "Media Owner": { value: "poongzwa" },
          Time: { timestamp: 1773648225 },
        },
      },
    ]);
    expect(items[0].fields.Comment?.value).toBe("fuckass cat");
    expect(items[0].fields["Media Owner"]?.value).toBe("poongzwa");
    expect(items[0].fields.Time?.timestamp).toBe(1773648225);
  });

  it("normalizes string_list_data into a list array", () => {
    const items = asStringMapArray([
      {
        title: "juice_stain_lee",
        string_list_data: [
          {
            href: "https://www.instagram.com/p/abc/",
            value: "👍",
            timestamp: 1750028701,
          },
        ],
      },
    ]);
    expect(items[0].title).toBe("juice_stain_lee");
    expect(items[0].list).toHaveLength(1);
    expect(items[0].list[0].href).toBe("https://www.instagram.com/p/abc/");
    expect(items[0].list[0].timestamp).toBe(1750028701);
  });

  it("handles items missing both string_map_data and string_list_data", () => {
    const items = asStringMapArray([{ title: "x" }]);
    expect(items[0].fields).toEqual({});
    expect(items[0].list).toEqual([]);
  });

  it("rejects malformed entries gracefully", () => {
    const items = asStringMapArray([null, "string", { string_map_data: null }]);
    expect(items).toHaveLength(3);
    expect(items[2].fields).toEqual({});
  });
});

describe("fieldValue / fieldTimestamp helpers", () => {
  const item = asStringMapArray([
    {
      string_map_data: {
        Comment: { value: "hello" },
        Time: { timestamp: 1773648225 },
        Empty: { timestamp: 0 },
      },
    },
  ])[0];

  it("fieldValue returns the named value", () => {
    expect(fieldValue(item, "Comment")).toBe("hello");
  });

  it("fieldValue returns undefined when missing", () => {
    expect(fieldValue(item, "Nope")).toBeUndefined();
  });

  it("fieldTimestamp returns the named timestamp", () => {
    expect(fieldTimestamp(item, "Time")).toBe(1773648225);
  });

  it("fieldTimestamp treats zero as missing", () => {
    expect(fieldTimestamp(item, "Empty")).toBeUndefined();
  });
});
