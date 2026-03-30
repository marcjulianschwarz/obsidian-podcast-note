export interface PodcastNoteSettings {
  podcastTemplate: string;
  atCursor: boolean;
  fileName: string;
  folder: string;
  templatePath: string;
}

export interface PodcastTextURL {
  url: string;
  alias: string;
  markdown: string;
}

export interface Podcast {
  title: string;
  desc: string;
  imageLink: string;
  showNotes: string;
  episodeDate: string;
  date: string;
  url: string;
}

export interface PodcastNote {
  title: string;
  content: string;
}
