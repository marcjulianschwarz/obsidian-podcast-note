import { describe, it, expect, beforeEach } from "vitest";
import { PodcastParser } from "../src/PodcastParser";
import { HOSTS } from "../src/constants";

const TEMPLATE =
  "# {{Title}}\n{{Description}}\n{{PodcastURL}}\n{{ShowNotes}}\n{{EpisodeDate}}\n{{ImageURL}}";

describe("PodcastParser", () => {
  let parser: PodcastParser;

  beforeEach(() => {
    parser = new PodcastParser(TEMPLATE);
  });

  describe("sanitizeString", () => {
    it("removes special characters", () => {
      expect(parser.sanitizeString("hello: world")).toBe("hello  world");
      expect(parser.sanitizeString("title [ep1]")).toBe("title  ep1 ");
      expect(parser.sanitizeString('say "hi"')).toBe("say  hi ");
    });

    it("leaves plain text unchanged", () => {
      expect(parser.sanitizeString("plain text 123")).toBe("plain text 123");
    });
  });

  describe("applyTemplate", () => {
    it("replaces all placeholders", () => {
      const podcast = {
        title: "My Podcast",
        desc: "A great show",
        url: "https://example.com",
        showNotes: "Episode notes",
        episodeDate: "2024-01-01",
        imageLink: "https://example.com/image.png",
        date: "2024-01-01",
      };

      const note = parser.applyTemplate({ ...podcast });

      expect(note.title).toBe("My Podcast");
      expect(note.content).toContain("# My Podcast");
      expect(note.content).toContain("A great show");
      expect(note.content).toContain("https://example.com");
      expect(note.content).toContain("Episode notes");
      expect(note.content).toContain("2024-01-01");
      expect(note.content).toContain("https://example.com/image.png");
    });

    it("sanitizes title and description before applying", () => {
      const podcast = {
        title: "Title: Episode 1",
        desc: "Desc [with] special: chars",
        url: "https://example.com",
        showNotes: "",
        episodeDate: "",
        imageLink: "",
        date: "",
      };

      const note = parser.applyTemplate({ ...podcast });
      // Title and desc are sanitized; the URL line still contains ':' but that's expected
      expect(note.content).not.toContain("Title: Episode 1");
      expect(note.content).not.toContain("Desc [with]");
    });
  });

  describe("getPodcastURLsFromSelection", () => {
    it("extracts markdown links", () => {
      const selection = "[My Episode](https://podcasts.apple.com/episode/1)";
      const urls = parser.getPodcastURLsFromSelection(selection);

      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe("https://podcasts.apple.com/episode/1");
      expect(urls[0].alias).toBe("|My Episode");
      expect(urls[0].markdown).toBe(selection);
    });

    it("extracts plain https links", () => {
      const selection = "https://podcasts.apple.com/episode/1";
      const urls = parser.getPodcastURLsFromSelection(selection);

      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe("https://podcasts.apple.com/episode/1");
      expect(urls[0].alias).toBe("");
    });

    it("extracts multiple links from selection", () => {
      const selection =
        "[Ep 1](https://podcasts.apple.com/1)\n[Ep 2](https://podcasts.apple.com/2)";
      const urls = parser.getPodcastURLsFromSelection(selection);

      expect(urls).toHaveLength(2);
    });

    it("returns empty array for plain text", () => {
      const urls = parser.getPodcastURLsFromSelection("no links here");
      expect(urls).toHaveLength(0);
    });
  });

  describe("isPodcastURLSupported", () => {
    it("accepts known hosts", () => {
      expect(
        parser.isPodcastURLSupported(`https://${HOSTS.apple}/episode`),
      ).toBe(true);
      expect(
        parser.isPodcastURLSupported(`https://${HOSTS.overcast}/episode`),
      ).toBe(true);
      expect(
        parser.isPodcastURLSupported(`https://${HOSTS.castro}/episode`),
      ).toBe(true);
      expect(
        parser.isPodcastURLSupported(`https://${HOSTS.pocketcasts}/episode`),
      ).toBe(true);
    });

    it("rejects unknown hosts", () => {
      expect(parser.isPodcastURLSupported("https://unknown.com/episode")).toBe(
        false,
      );
    });
  });
});
