import { DEFAULT_PODCAST, HOSTS } from "./constants";
import { Notice, moment, htmlToMarkdown, request } from "obsidian";
import { Podcast, PodcastNote, PodcastTextURL } from "./interfaces";

export class PodcastParser {
  template: string;

  constructor(template: string) {
    this.template = template;
  }

  async requestHTML(url: string) {
    try {
      let response = await request({ url: url, method: "GET" });
      let parser = new DOMParser();
      return parser.parseFromString(response, "text/html");
    } catch (reason) {
      new Notice("Error loading podcast: " + reason);
      return undefined;
    }
  }

  async loadEpisodeUUID(url: string) {
    let response = await request({ url });
    return response;
  }

  async applyTemplate(podcast: Podcast): Promise<PodcastNote> {
    let content = this.template
      .replace(/{{Title}}/g, podcast.title)
      .replace(/{{ImageURL}}/g, podcast.imageLink)
      .replace(/{{Description}}/g, podcast.desc)
      .replace(/{{Date}}/g, podcast.date)
      .replace(/{{Timestamp}}/g, Date.now().toString())
      .replace(/{{PodcastURL}}/g, podcast.url)
      .replace(/{{ShowNotes}}/g, podcast.showNotes)
      .replace(/{{EpisodeDate}}/g, podcast.episodeDate);
    return { title: podcast.title, content: content };
  }

  metaOG(root: Document, attribute: string, og: string) {
    let titleTag = root.querySelector(
      "meta[" + attribute + "='og:" + og + "']"
    );
    if (titleTag) {
      let title = titleTag.getAttribute("content");
      if (title) {
        return title;
      }
    }
    return "";
  }

  async loadPodcast(root: Document, url: string): Promise<Podcast> {
    let podcast = DEFAULT_PODCAST;
    podcast.url = url;
    podcast.date = moment().format("YYYY-MM-DD");

    if (url.includes(HOSTS.apple)) {
      podcast.title = this.metaOG(root, "property", "title");
      podcast.desc =
        root.querySelector(".product-hero-desc__section")?.querySelector("p")
          ?.innerHTML || "";

      let artwork = root.querySelector(".we-artwork__source");
      podcast.imageLink = artwork?.getAttribute("srcset")?.split(" ")[0] || "";
    } else if (url.includes(HOSTS.airr)) {
      podcast.title = this.metaOG(root, "property", "title");
      podcast.desc = this.metaOG(root, "name", "description");
      podcast.imageLink = this.metaOG(root, "property", "image");
    } else if (url.includes(HOSTS.overcast)) {
      podcast.title = this.metaOG(root, "name", "title");
      podcast.desc = this.metaOG(root, "name", "description");
      podcast.imageLink = this.metaOG(root, "name", "image");
    } else if (url.includes(HOSTS.youtube)) {
      podcast.title =
        root.querySelector("title")?.innerHTML || "Title not found";
      podcast.desc =
        root
          .querySelector("#watch7-content > meta:nth-child(3)")
          ?.getAttribute("content") || "";
      //desc = root.querySelector(".ytd-video-secondary-info-renderer").innerHTML;
      podcast.imageLink = this.metaOG(root, "property", "image");
    } else if (url.includes(HOSTS.pocketcasts)) {
      podcast.title = this.metaOG(root, "property", "title");
      let script = root.querySelector("body > script");
      if (script) {
        let scriptHtml = script.innerHTML;
        let regex = /EPISODE_UUID = '(.*)'/gm;
        let uuid = regex.exec(scriptHtml);
        if (uuid) {
          let json_notes = JSON.parse(
            await this.loadEpisodeUUID(
              "https://cache.pocketcasts.com/share/episode/show_notes/" +
                uuid[1]
            )
          )["show_notes"];
          podcast.showNotes = htmlToMarkdown(json_notes);
        }
      }

      podcast.desc = this.metaOG(root, "property", "description");
      let episodeDateHTML = root.querySelector("#episode_date");
      if (episodeDateHTML) {
        podcast.episodeDate = episodeDateHTML.innerHTML;
      }
      podcast.imageLink = this.metaOG(root, "property", "image");
    } else if (url.includes(HOSTS.castro)) {
      podcast.title = this.metaOG(root, "property", "title");
      podcast.desc = this.metaOG(root, "property", "description");
      podcast.imageLink = this.metaOG(root, "property", "image");
      podcast.showNotes = htmlToMarkdown(
        root.querySelector(".co-supertop-castro-show-notes")?.innerHTML || ""
      );
    } else if (url.includes(HOSTS.addict)) {
      podcast.title = this.metaOG(root, "property", "title");
      podcast.desc = this.metaOG(root, "property", "description");
      podcast.imageLink = this.metaOG(root, "property", "image");
    } else {
      podcast.title = this.metaOG(root, "property", "title");
      podcast.desc = this.metaOG(root, "property", "description");
      podcast.imageLink = this.metaOG(root, "property", "image");
    }

    // Obsidian mobile can only transclude images with https urls
    if (!podcast.imageLink.startsWith("https")) {
      podcast.imageLink = podcast.imageLink.replace("http", "https");
    }

    return podcast;
  }

  async getPodcastNote(url: string): Promise<PodcastNote> {
    let root = await this.requestHTML(url);

    if (root) {
      let podcast = await this.loadPodcast(root, url);
      let podcastNote = await this.applyTemplate(podcast);
      return podcastNote;
    } else {
      return { title: "", content: "" };
    }
  }

  isPodcastURLSupported(url: string) {
    if (new RegExp(Object.values(HOSTS).join("|")).test(url)) {
      return true;
    } else {
      new Notice("This podcast service is not supported.");
      return false;
    }
  }

  getPodcastURLsFromSelection(selection: string): PodcastTextURL[] {
    let reg = /\[([^\]]*)\]\(([^\)]+)\)/g;
    let m;
    let podcasts: PodcastTextURL[] = [];

    // Search for markdown links
    while ((m = reg.exec(selection)) !== null) {
      let url = m[2];
      let linkTitle = m[1];
      podcasts.push({ url: url, alias: "|" + linkTitle, markdown: m[0] });
    }

    // Search for pure links
    let words = selection.split(/[\r\n|\n|\r|\s]/);
    console.log(words);
    words.forEach((word) => {
      if (word.startsWith("https://")) {
        podcasts.push({ url: word, alias: "", markdown: word });
      }
    });

    return podcasts;
  }

  getPodcastsFromSelection(selection: string): PodcastNote[] {
    let podcasts: PodcastNote[] = [];
    let urls = this.getPodcastURLsFromSelection(selection);

    urls.forEach(async (url) => {
      podcasts.push(await this.getPodcastNote(url.url));
    });

    return podcasts;
  }
}
