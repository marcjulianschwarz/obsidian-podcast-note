import { describe, it, expect, beforeEach, vi } from "vitest";
import { NoteCreator } from "../src/NoteCreator";

(globalThis as any).window = { moment: () => ({ format: () => "2024-01-15" }) };

const mockApp = {} as any;

describe("NoteCreator", () => {
  let nc: NoteCreator;

  beforeEach(() => {
    nc = new NoteCreator(mockApp, "{{Title}} - Notes");
  });

  describe("applyFileNameTemplate", () => {
    const podcast = { title: "My Episode", content: "" };

    it("replaces {{Title}}", () => {
      nc = new NoteCreator(mockApp, "{{Title}} - Notes");
      expect(nc.applyFileNameTemplate(podcast)).toBe("My Episode - Notes");
    });

    it("replaces {{Date}}", () => {
      nc = new NoteCreator(mockApp, "{{Date}} - {{Title}}");
      expect(nc.applyFileNameTemplate(podcast)).toBe("2024-01-15 - My Episode");
    });

    it("replaces {{Timestamp}} with a numeric string", () => {
      nc = new NoteCreator(mockApp, "{{Timestamp}}");
      expect(nc.applyFileNameTemplate(podcast)).toMatch(/^\d+$/);
    });

    it("strips illegal filename characters", () => {
      nc = new NoteCreator(mockApp, "{{Title}}");
      const illegalPodcast = { title: 'bad/name:with*chars?"<>|', content: "" };
      const result = nc.applyFileNameTemplate(illegalPodcast);
      expect(result).not.toMatch(/[/:"*?<>|]/);
    });
  });
});
