import { describe, it, expect, vi } from "vitest";
import { runRegistry } from "@/modules/registry";
import type { InsightModule } from "@/modules/types";
import type { ParsedBundle } from "@/model/events";

const EMPTY_BUNDLE: ParsedBundle = {
  account: { type: "personal", owner: {} },
  interactions: [],
  profileChanges: [],
  logins: [],
  adInterests: [],
  errors: [],
};

function makeModule(
  overrides: Partial<InsightModule> = {},
): InsightModule {
  return {
    id: "test-module",
    title: "Test Module",
    requires: [],
    run: () => ({ status: "ok", data: 42 }),
    ...overrides,
  };
}

describe("runRegistry — gating", () => {
  it("skips a module when a required pattern matches no path", () => {
    const m = makeModule({
      requires: ["your_instagram_activity/likes/liked_posts.json"],
    });
    const runs = runRegistry(EMPTY_BUNDLE, ["other/file.json"], { kind: "all" }, [m]);
    expect(runs).toHaveLength(1);
    expect(runs[0].result.status).toBe("skipped");
    if (runs[0].result.status === "skipped") {
      expect(runs[0].result.reason).toContain("liked_posts.json");
    }
  });

  it("runs a module when all required patterns are satisfied", () => {
    const m = makeModule({
      requires: ["your_instagram_activity/likes/liked_posts.json"],
    });
    const runs = runRegistry(
      EMPTY_BUNDLE,
      ["your_instagram_activity/likes/liked_posts.json"],
      { kind: "all" },
      [m],
    );
    expect(runs[0].result.status).toBe("ok");
  });

  it("supports glob patterns in requires", () => {
    const m = makeModule({
      requires: ["your_instagram_activity/messages/inbox/**"],
    });
    const runs = runRegistry(
      EMPTY_BUNDLE,
      ["your_instagram_activity/messages/inbox/alice_1/message_1.json"],
      { kind: "all" },
      [m],
    );
    expect(runs[0].result.status).toBe("ok");
  });

  it("lists every missing pattern in the skip reason", () => {
    const m = makeModule({
      requires: ["a.json", "b.json", "c.json"],
    });
    const runs = runRegistry(EMPTY_BUNDLE, ["b.json"], { kind: "all" }, [m]);
    if (runs[0].result.status === "skipped") {
      expect(runs[0].result.reason).toContain("a.json");
      expect(runs[0].result.reason).toContain("c.json");
      expect(runs[0].result.reason).not.toContain("b.json");
    } else {
      throw new Error("expected skipped");
    }
  });

  it("an empty requires array always passes the gate", () => {
    const m = makeModule({ requires: [] });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [m]);
    expect(runs[0].result.status).toBe("ok");
  });

  it("does not gate on optional patterns", () => {
    const m = makeModule({
      requires: [],
      optional: ["never-matches/*.json"],
    });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [m]);
    expect(runs[0].result.status).toBe("ok");
  });
});

describe("runRegistry — execution", () => {
  it("passes the bundle and scope to the module's run", () => {
    const run = vi.fn(() => ({ status: "ok" as const, data: null }));
    const m = makeModule({ run });
    const scope = { kind: "year" as const, year: 2025 };
    runRegistry(EMPTY_BUNDLE, [], scope, [m]);
    expect(run).toHaveBeenCalledWith({ bundle: EMPTY_BUNDLE, scope });
  });

  it("returns whatever the module returns (ok)", () => {
    const m = makeModule({ run: () => ({ status: "ok", data: "hello" }) });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [m]);
    if (runs[0].result.status === "ok") {
      expect(runs[0].result.data).toBe("hello");
    } else {
      throw new Error("expected ok");
    }
  });

  it("returns whatever the module returns (skipped)", () => {
    const m = makeModule({
      run: () => ({ status: "skipped", reason: "no data" }),
    });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [m]);
    expect(runs[0].result.status).toBe("skipped");
  });

  it("catches thrown errors and converts to status: error", () => {
    const m = makeModule({
      run: () => {
        throw new Error("kaboom");
      },
    });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [m]);
    expect(runs[0].result.status).toBe("error");
    if (runs[0].result.status === "error") {
      expect(runs[0].result.error).toBe("kaboom");
    }
  });

  it("a buggy module does not affect other modules", () => {
    const buggy = makeModule({
      id: "buggy",
      run: () => {
        throw new Error("kaboom");
      },
    });
    const ok = makeModule({
      id: "ok",
      run: () => ({ status: "ok", data: 1 }),
    });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [buggy, ok]);
    expect(runs).toHaveLength(2);
    expect(runs[0].result.status).toBe("error");
    expect(runs[1].result.status).toBe("ok");
  });

  it("returns one row per registered module, in order", () => {
    const a = makeModule({ id: "a" });
    const b = makeModule({ id: "b" });
    const c = makeModule({ id: "c" });
    const runs = runRegistry(EMPTY_BUNDLE, [], { kind: "all" }, [a, b, c]);
    expect(runs.map((r) => r.module.id)).toEqual(["a", "b", "c"]);
  });
});
