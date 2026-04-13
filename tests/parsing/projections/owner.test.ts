import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractZip } from "@/parsing/extract";
import { projectOwner } from "@/parsing/projections/owner";
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

describe("projectOwner — synthetic", () => {
  it("returns empty when the file is missing", async () => {
    const manifest = await manifestFromFiles({});
    expect(await projectOwner(manifest)).toEqual({});
  });

  it("extracts displayName and handle from string_map_data", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/personal_information.json":
        JSON.stringify({
          profile_user: [
            {
              string_map_data: {
                Username: { value: "alice_handle" },
                Name: { value: "Alice Anderson" },
              },
            },
          ],
        }),
    });
    expect(await projectOwner(manifest)).toEqual({
      displayName: "Alice Anderson",
      handle: "alice_handle",
    });
  });

  it("returns empty when profile_user is empty", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/personal_information.json":
        JSON.stringify({ profile_user: [] }),
    });
    expect(await projectOwner(manifest)).toEqual({});
  });

  it("returns partial result when only one field is present", async () => {
    const manifest = await manifestFromFiles({
      "personal_information/personal_information/personal_information.json":
        JSON.stringify({
          profile_user: [
            { string_map_data: { Username: { value: "only_handle" } } },
          ],
        }),
    });
    expect(await projectOwner(manifest)).toEqual({
      handle: "only_handle",
    });
  });
});

describe("projectOwner — real export", () => {
  it("returns Waikong / mit_yea", async () => {
    const blob = await loadRealExportZip();
    const manifest = await extractZip(blob);
    expect(await projectOwner(manifest)).toEqual({
      displayName: "Waikong",
      handle: "mit_yea",
    });
  });
});
