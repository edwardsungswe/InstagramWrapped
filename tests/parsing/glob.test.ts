import { describe, it, expect } from "vitest";
import { matches } from "@/parsing/glob";

describe("glob matches", () => {
  describe("literal patterns", () => {
    it("matches an exact path", () => {
      expect(matches("a/b/c.json", "a/b/c.json")).toBe(true);
    });

    it("does not match a different path", () => {
      expect(matches("a/b/d.json", "a/b/c.json")).toBe(false);
    });

    it("does not match a prefix", () => {
      expect(matches("a/b/c.json", "a/b")).toBe(false);
    });
  });

  describe("single-segment wildcard *", () => {
    it("matches a single segment", () => {
      expect(matches("a/b/c.json", "a/*/c.json")).toBe(true);
    });

    it("does not cross slashes", () => {
      expect(matches("a/b/c/d.json", "a/*/d.json")).toBe(false);
    });

    it("matches a partial filename", () => {
      expect(matches("a/post_comments_1.json", "a/post_comments_*.json")).toBe(
        true,
      );
    });
  });

  describe("multi-segment wildcard **", () => {
    it("matches deeply nested paths", () => {
      expect(matches("a/b/c/d.json", "a/**/d.json")).toBe(true);
    });

    it("matches zero segments", () => {
      expect(matches("a/d.json", "a/**/d.json")).toBe(true);
    });

    it("matches everything below a prefix", () => {
      expect(
        matches("messages/inbox/ryan_123/message_1.json", "messages/inbox/**"),
      ).toBe(true);
    });

    it("does not match a sibling tree", () => {
      expect(matches("messages/sent/x.json", "messages/inbox/**")).toBe(false);
    });
  });

  describe("realistic Instagram paths", () => {
    it("matches a known liked_posts file", () => {
      expect(
        matches(
          "your_instagram_activity/likes/liked_posts.json",
          "your_instagram_activity/likes/liked_posts.json",
        ),
      ).toBe(true);
    });

    it("matches all message threads", () => {
      expect(
        matches(
          "your_instagram_activity/messages/inbox/ryan_461007898632310/message_1.json",
          "your_instagram_activity/messages/inbox/**",
        ),
      ).toBe(true);
    });
  });
});
