import { PodcastNoteSettings, Podcast } from "./interfaces";

export const DEFAULT_SETTINGS: PodcastNoteSettings = {
  podcastTemplate:
    "---\ntags: [Podcast]\ndate: {{Date}}\n---\n# {{Title}}\n![]({{ImageURL}})\n## Description:\n{{Description}}\n-> [Podcast Link]({{PodcastURL}})\n\n## Notes:\n",
  atCursor: false,
  fileName: "{{Title}} - Notes",
  folder: "",
  templatePath: "",
};

export const HOSTS = {
  spotify: "open.spotify.com",
  apple: "podcasts.apple.com",
  google: "podcasts.google.com",
  pocketcasts: "pca.st",
  airr: "www.airr.io",
  overcast: "overcast.fm",
  castbox: "castbox.fm",
  castro: "castro.fm",
  youtube: "youtube.com",
  addict: "podcastaddict.com",
};

export const DEFAULT_PODCAST: Podcast = {
  date: "",
  title: "Title not found",
  desc: "Description not found",
  imageLink: "",
  showNotes: "",
  episodeDate: "",
  url: "",
};

export enum NoteCreationMethod {
  NewNote,
  AddAtCursor,
}
