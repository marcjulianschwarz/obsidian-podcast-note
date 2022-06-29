import { Editor, Notice, moment, App } from "obsidian";
import { PodcastNote } from "./interfaces";

export class NoteCreator {
  app: App;
  filenameTemplate: string;

  constructor(app: App, filenameTemplate: string) {
    this.app = app;
    this.filenameTemplate = filenameTemplate;
  }

  addPodcastAtCursor(podcast: PodcastNote, editor: Editor) {
    let currentLine = editor.getCursor();
    editor.replaceRange(podcast.content, currentLine, currentLine);
  }

  applyFileNameTemplate(podcast: PodcastNote) {
    return this.filenameTemplate
      .replace(/{{Title}}/g, podcast.title)
      .replace(/{{Timestamp}}/g, Date.now().toString())
      .replace(/{{Date}}/g, moment().format("YYYY-MM-DD"))
      .replace(/[\\/:"*?<>|]*/g, "");
  }

  createPodcastNote(podcast: PodcastNote, folder: string) {
    let fileName = this.applyFileNameTemplate(podcast);

    this.app.vault.create(folder + "/" + fileName + ".md", podcast.content);
    return fileName;
  }
}
