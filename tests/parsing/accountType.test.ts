import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { detectAccountType } from "@/parsing/accountType";
import { loadRealExportZip } from "../helpers/zipFromDir";

async function manifestFromFiles(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = new Blob([
    new Uint8Array(
      await zip.generateAsync({ type: "uint8array", compression: "STORE" }),
    ),
  ]);
  return extractZip(blob);
}

describe("detectAccountType — synthetic", () => {
  it("returns 'personal' when neither file is present", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/likes/liked_posts.json": "[]",
    });
    expect(await detectAccountType(manifest)).toBe("personal");
  });

  it("returns 'personal' when both files exist but are empty/Not Eligible", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/professional_information.json":
        JSON.stringify({
          profile_business: [
            { string_map_data: {} },
          ],
        }),
      "your_instagram_activity/monetization/eligibility.json": JSON.stringify({
        monetization_eligibility: [
          {
            string_map_data: {
              Decision: { value: "Not Eligible" },
            },
          },
        ],
      }),
    });
    expect(await detectAccountType(manifest)).toBe("personal");
  });

  it("returns 'creator' when professional_information has populated string_map_data", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/professional_information.json":
        JSON.stringify({
          profile_business: [
            {
              string_map_data: {
                "Business Category": { value: "Public Figure" },
              },
            },
          ],
        }),
    });
    expect(await detectAccountType(manifest)).toBe("creator");
  });

  it("returns 'creator' when monetization shows an Eligible decision", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/monetization/eligibility.json": JSON.stringify({
        monetization_eligibility: [
          {
            string_map_data: {
              Decision: { value: "Not Eligible" },
            },
          },
          {
            string_map_data: {
              Decision: { value: "Eligible" },
            },
          },
        ],
      }),
    });
    expect(await detectAccountType(manifest)).toBe("creator");
  });

  it("returns 'creator' when monetization shows an Approved decision", async () => {
    const manifest = await manifestFromFiles({
      "your_instagram_activity/monetization/eligibility.json": JSON.stringify({
        monetization_eligibility: [
          {
            string_map_data: { Decision: { value: "Approved" } },
          },
        ],
      }),
    });
    expect(await detectAccountType(manifest)).toBe("creator");
  });

  it("treats malformed files as personal (graceful degradation)", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/professional_information.json":
        "not json",
      "your_instagram_activity/monetization/eligibility.json": "{}",
    });
    expect(await detectAccountType(manifest)).toBe("personal");
  });
});

describe("detectAccountType — real export", () => {
  it("returns 'personal' for the bundled export", async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    expect(await detectAccountType(manifest)).toBe("personal");
  });
});
