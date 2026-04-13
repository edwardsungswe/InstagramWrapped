import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { projectAdInterests } from "@/parsing/projections/adInterests";
import { loadRealExportZip } from "../../helpers/zipFromDir";

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

describe("projectAdInterests — synthetic", () => {
  it("returns empty when neither file is present", async () => {
    const manifest = await manifestFromFiles({});
    expect(await projectAdInterests(manifest)).toEqual([]);
  });

  it("extracts categories from the vec block", async () => {
    const manifest = await manifestFromFiles({
      "ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json":
        JSON.stringify({
          media: [],
          label_values: [
            {
              label: "Name",
              vec: [
                { value: "Travel" },
                { value: "Food enthusiasts" },
              ],
            },
          ],
          fbid: "x",
        }),
    });
    const interests = await projectAdInterests(manifest);
    expect(interests).toEqual([
      { name: "Travel" },
      { name: "Food enthusiasts" },
    ]);
  });

  it("extracts advertiser names with group=Advertiser", async () => {
    const manifest = await manifestFromFiles({
      "ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json":
        JSON.stringify({
          ig_custom_audiences_all_types: [
            { advertiser_name: "gorjana" },
            { advertiser_name: "the7stars" },
            { not_an_advertiser: true },
          ],
        }),
    });
    const interests = await projectAdInterests(manifest);
    expect(interests).toEqual([
      { name: "gorjana", group: "Advertiser" },
      { name: "the7stars", group: "Advertiser" },
    ]);
  });
});

describe("projectAdInterests — real export", () => {
  it("returns at least one interest", async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    const interests = await projectAdInterests(manifest);
    expect(interests.length).toBeGreaterThan(0);
  });
});
