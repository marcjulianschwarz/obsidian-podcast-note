import {
  App,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

import { PodcastNoteSettings } from "./src/interfaces";
import { DEFAULT_SETTINGS, NoteCreationMethod } from "./src/constants";
import { PodcastParser } from "./src/PodcastParser";
import { NoteCreator } from "./src/NoteCreator";

export default class PodcastNote extends Plugin {
  settings: PodcastNoteSettings;

  async onload() {
    console.log("loading plugin PodcastNote");
    await this.loadSettings();

    this.addSettingTab(new PodcastNoteSettingTab(this.app, this));

    this.addCommand({
      id: "add-podcast-note",
      name: "Add Podcast Note",

      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new PodcastNoteModal(this.app, this).open();
          }
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: "add-podcast-notes-from-selection",
      name: "Add Podcast Notes from selection",

      editorCallback: () => {
        this.createPodcastNotesFromSelection();
      },
    });
  }

  onunload() {
    console.log("unloading plugin PodcastNote");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getEditor() {
    let mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (mdView) {
      return mdView.editor;
    }
  }

  async getTemplate() {
    if (this.settings.templatePath != "") {
      let path = this.settings.templatePath;
      if (!path.endsWith(".md")) {
        path += ".md";
      }
      let file = this.app.metadataCache.getFirstLinkpathDest(path, "");
      if (file) {
        return await this.app.vault.read(file);
      }
    }
    return this.settings.podcastTemplate;
  }

  async newPodcastNote(url: string, method: NoteCreationMethod) {
    let template = await this.getTemplate();
    let parser = new PodcastParser(template);

    new Notice("Loading Podcast Info");

    if (parser.isPodcastURLSupported(url)) {
      let podcastNote = await parser.getPodcastNote(url);

      let nc = new NoteCreator(this.app, this.settings.fileName);

      switch (method) {
        case NoteCreationMethod.NewNote:
          nc.createPodcastNote(podcastNote, this.settings.folder);
          break;
        case NoteCreationMethod.AddAtCursor:
          let editor = this.getEditor();
          if (editor) {
            nc.addPodcastAtCursor(podcastNote, editor);
          } else {
            new Notice("You have to be in the editor to do this.");
          }
          break;
      }
    }
  }

  async createPodcastNotesFromSelection() {
    let template = await this.getTemplate();
    let editor = this.getEditor();
    let parser = new PodcastParser(template);

    new Notice("Loading Podcast Info");

    if (editor) {
      let selection = editor.getSelection();
      let links = await parser.getPodcastURLsFromSelection(selection);
      let nc = new NoteCreator(this.app, this.settings.fileName);

      for (let link of links) {
        if (parser.isPodcastURLSupported(link.url)) {
          let podcastNote = await parser.getPodcastNote(link.url);
          let filename = nc.createPodcastNote(
            podcastNote,
            this.settings.folder
          );

          selection = selection.replace(
            link.markdown,
            "[[" + filename + link.alias + "]]"
          );
        }
      }
      editor.replaceSelection(selection);
    } else {
      new Notice("You have to be in the editor to do this.");
    }
  }
}

class PodcastNoteModal extends Modal {
  plugin: PodcastNote;

  constructor(app: App, plugin: PodcastNote) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.createEl("h3", { text: "Enter podcast URL:" });
    let input = contentEl.createEl("input", { type: "text" });
    contentEl.createEl("br");
    contentEl.createEl("br");
    let button = contentEl.createEl("button", { text: "Add Podcast Note" });

    button.addEventListener("click", () => {
      let url = input.value;
      if (this.plugin.settings.atCursor) {
        this.plugin.newPodcastNote(url, NoteCreationMethod.AddAtCursor);
      } else {
        this.plugin.newPodcastNote(url, NoteCreationMethod.NewNote);
      }
      this.close();
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

class PodcastNoteSettingTab extends PluginSettingTab {
  plugin: PodcastNote;

  constructor(app: App, plugin: PodcastNote) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Settings for Podcast Note" });

    new Setting(containerEl)
      .setName("Template")
      .setDesc(
        "Define your own template. Available placeholders are: {{Title}}, {{ImageURL}}, {{Description}}, {{ShowNotes}}, {{EpisodeDate}}, {{PodcastURL}}, {{Date}}, {{Timestamp}}"
      )
      .addTextArea((textarea) => {
        textarea
          .setValue(this.plugin.settings.podcastTemplate)
          .onChange(async () => {
            this.plugin.settings.podcastTemplate = textarea.getValue();
            await this.plugin.saveSettings();
          });
        textarea.inputEl.rows = 10;
        textarea.inputEl.cols = 35;
      });

    new Setting(containerEl)
      .setName("Template File")
      .setDesc(
        "Define your own template in a .md file. Enter the path here (relative to vault)"
      )
      .addTextArea((textarea) =>
        textarea
          .setValue(this.plugin.settings.templatePath)
          .setPlaceholder("path/to/template")
          .onChange(async () => {
            this.plugin.settings.templatePath = textarea.getValue();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Folder")
      .setDesc("New Podcast Notes will be saved here (default: Vault folder)")
      .addTextArea((textarea) =>
        textarea
          .setValue(this.plugin.settings.folder)
          .setPlaceholder("example: Podcasts")
          .onChange(async () => {
            this.plugin.settings.folder = textarea.getValue();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc(
        'Filename template when "New note" is selected. Available placeholders are {{Title}}, {{Timestamp}}, {{Date}}'
      )
      .addTextArea((textarea) =>
        textarea.setValue(this.plugin.settings.fileName).onChange(async () => {
          this.plugin.settings.fileName = textarea.getValue();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Insert at cursor")
      .setDesc("Insert podcast note at cursor (default: create new note)")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.atCursor).onChange(async () => {
          this.plugin.settings.atCursor = toggle.getValue();
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("hr");
    containerEl.createEl("p", { text: "Supported podcast services:" });
    let ul = containerEl.createEl("ul");
    ul.createEl("li", { text: "Apple" });
    ul.createEl("li", { text: "Spotify" });
    ul.createEl("li", { text: "Google" });
    ul.createEl("li", { text: "Pocket Casts" });
    ul.createEl("li", { text: "Airr" });
    ul.createEl("li", { text: "Overcast" });
    ul.createEl("li", { text: "Castro" });
    ul.createEl("li", { text: "YouTube" });
  }
}
