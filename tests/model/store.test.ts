import { describe, it, expect, beforeEach } from "vitest";
import { useUploadStore } from "@/model/store";
import type { ParsedBundle } from "@/model/events";

const FAKE_BUNDLE: ParsedBundle = {
  account: { type: "personal", owner: { displayName: "Test", handle: "test" } },
  interactions: [{ kind: "like", ts: 1700000000 }],
  profileChanges: [],
  logins: [],
  adInterests: [],
  errors: [],
};

const FAKE_INPUT = {
  bundle: FAKE_BUNDLE,
  paths: ["a.json", "b.json"],
  fileCount: 2,
  fileName: "test.zip",
};

describe("useUploadStore", () => {
  beforeEach(() => {
    useUploadStore.getState().clear();
  });

  describe("initial state", () => {
    it("starts with a null bundle", () => {
      expect(useUploadStore.getState().bundle).toBeNull();
    });

    it("starts with empty paths", () => {
      expect(useUploadStore.getState().paths).toEqual([]);
    });

    it("starts with zero file count and null file name", () => {
      const s = useUploadStore.getState();
      expect(s.fileCount).toBe(0);
      expect(s.fileName).toBeNull();
    });
  });

  describe("setBundle", () => {
    it("populates every field together", () => {
      useUploadStore.getState().setBundle(FAKE_INPUT);
      const s = useUploadStore.getState();
      expect(s.bundle).toBe(FAKE_BUNDLE);
      expect(s.paths).toEqual(["a.json", "b.json"]);
      expect(s.fileCount).toBe(2);
      expect(s.fileName).toBe("test.zip");
    });

    it("replaces an existing bundle", () => {
      useUploadStore.getState().setBundle(FAKE_INPUT);
      const second = {
        ...FAKE_INPUT,
        fileName: "second.zip",
        fileCount: 99,
      };
      useUploadStore.getState().setBundle(second);
      expect(useUploadStore.getState().fileName).toBe("second.zip");
      expect(useUploadStore.getState().fileCount).toBe(99);
    });
  });

  describe("clear", () => {
    it("resets every field", () => {
      useUploadStore.getState().setBundle(FAKE_INPUT);
      useUploadStore.getState().clear();
      const s = useUploadStore.getState();
      expect(s.bundle).toBeNull();
      expect(s.paths).toEqual([]);
      expect(s.fileCount).toBe(0);
      expect(s.fileName).toBeNull();
    });

    it("is idempotent", () => {
      useUploadStore.getState().clear();
      useUploadStore.getState().clear();
      expect(useUploadStore.getState().bundle).toBeNull();
    });
  });

  describe("privacy guarantee", () => {
    it("does not write to localStorage", () => {
      // localStorage exists in jsdom; verify the store never touches it.
      const before = JSON.stringify({ ...localStorage });
      useUploadStore.getState().setBundle(FAKE_INPUT);
      const after = JSON.stringify({ ...localStorage });
      expect(after).toBe(before);
    });

    it("does not write to sessionStorage", () => {
      const before = JSON.stringify({ ...sessionStorage });
      useUploadStore.getState().setBundle(FAKE_INPUT);
      const after = JSON.stringify({ ...sessionStorage });
      expect(after).toBe(before);
    });
  });
});
