import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, request, moment } from 'obsidian';

interface PodcastNoteSettings {
	podcastTemplate: string,
	atCursor: boolean,
	fileName: string,
	folder: string
}

const DEFAULT_SETTINGS: PodcastNoteSettings = {
	podcastTemplate: "---\ntags: [Podcast]\ndate: {{Date}}\n---\n# {{Title}}\n![]({{ImageURL}})\n## Description:\n{{Description}}\n-> [Podcast Link]({{PodcastURL}})\n\n## Notes:\n",
	atCursor: false,
	fileName: "{{Title}} - Notes",
	folder: ""
};

const hosts = {
	"spotify": "open.spotify.com",
	"apple": "podcasts.apple.com",
	"google": "podcasts.google.com",
	"pocketcasts": "pca.st",
	"airr": "www.airr.io",
	"overcast": "overcast.fm",
	"castbox": "castbox.fm",
	"castro": "castro.fm"
};


export default class PodcastNote extends Plugin {

	settings: PodcastNoteSettings;

	async onload() {
		console.log('loading plugin PodcastNote');
		await this.loadSettings();

		this.addSettingTab(new PodcastNoteSettingTab(this.app, this));

		this.addCommand({
			id: 'add-podcast-note',
			name: 'Add Podcast Note',

			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new PodcastNoteModal(this.app, this).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'add-podcast-notes-from-selection',
			name: 'Add Podcast Notes from selection',

			editorCallback: () => {
				this.addNotesFromList();
			}
		});
	}

	onunload() {
		console.log('unloading plugin PodcastNote');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getAirrQuoteTranscript(url){
		let html = await this.getHtml(url);
		let root = this.getParsedHtml(html);
		let airrQuoteTranscript = root.querySelector(".quote_contextContainer__2afpx");
		console.log(root);
	}

	async getHtml(url){
		return await request({url: url, method: "GET"});
	}

	async addNotesFromList() {

		let editor = this.getEditor();
		if (editor){
			let selection = editor.getSelection();
			let podcasts = this.getPodcastsFromSelection(selection);

			for (let podcast of podcasts){
				let filename = await this.addPodcastNote(podcast.url);
				selection = selection.replace(podcast.markdown, "[[" + filename + podcast.linkTitle + "]]");
			}
			editor.replaceSelection(selection);

		} else {
			new Notice("You have to be in the editor to do this.");
		}

	}

	async addPodcastNote(url: string) {
		let { title, podcastString } = await this.getTitleAndPodcastString(url);
		return this.addNewNote(podcastString, title);
	}

	async insertPodcastNote(url: string){
		let { title, podcastString } = await this.getTitleAndPodcastString(url);
		this.addAtCursor(podcastString);
	}

	async getTitleAndPodcastString(url){
		new Notice("Loading Podcast Info");
		if (this.checkPodcastURL(url)){
			try {
				let html = await this.getHtml(url);
				let root = this.getParsedHtml(html);
				return this.getMetaDataForPodcast(root, url);
			} catch (reason) {
				this.podcastError(url, "Couldnt load podcast data. No internet connection?");
				console.log("No connection, reason: \n" + reason);
			}
		} else {
			this.podcastError(url, "This podcast service is not supported or the url is invalid.");
		}
	}

	getPodcastsFromSelection(selection: string){

		let reg = /\[([^\]]*)\]\(([^\)]+)\)/g;
		let m;
		let podcasts = [];
		
		// Search for markdown links
		while ((m = reg.exec(selection)) !== null){
			let url = m[2];
			let linkTitle = m[1];
			podcasts.push({"url": url, "linkTitle": " | " + linkTitle, "markdown": m[0]});
		}

		// Search for pure links
		let words = selection.split(/[\r\n|\n|\r|\s]/);
		console.log(words);
		words.forEach((word) => {
			if (word.startsWith("https://")){
				podcasts.push({"url": word, "linkTitle": "", "markdown": word});
			}
		});

		return podcasts;
	}

	podcastError(url, msg){
		new Notice(msg);
		this.addNewNote("# Notes on podcast\n-> [Podcast Link](" + url + ")\n", "Default");
	}

	checkPodcastURL(url: string) {
		if (new RegExp(Object.values(hosts).join("|")).test(url)) {
			return true;
		} else {
			new Notice("This is not a valid podcast Service.");
			return false;
		}
	}

	getParsedHtml(s) {
		let parser = new DOMParser();
		let root = parser.parseFromString(s, "text/html");
		return root;
	}

	getMetaDataForPodcast(root: Document, url: string) {
		let date = moment().format("YYYY-MM-DD")
		let title = "Title not found"
		let desc = "Maybe the URL was invalid or inclompete. Open settings and check if your podcast service is supported."
		let imageLink = ""

		try {
			if (url.includes(hosts.apple)) {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector(".product-hero-desc__section").querySelector("p").innerHTML;
				let artwork = root.querySelector(".we-artwork__source");
				imageLink = artwork.getAttribute('srcset').split(" ")[0];
			} else if (url.includes(hosts.airr)) {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[name='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			} else if (url.includes(hosts.overcast)) {
				title = root.querySelector("meta[name='og:title']").getAttribute('content');
				desc = root.querySelector("meta[name='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[name='og:image']").getAttribute('content');
			} else {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[property='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			}
		} catch {
			console.log("Error parsing: " + url);
		}

		let podcastString = this.applyTemplate(title, imageLink, desc, date, url);
		return { "podcastString": podcastString, "title": title };
	}

	applyTemplate(title, imageLink, desc, dateString, podcastLink) {
		let podcastTemplate = this.settings.podcastTemplate;
		podcastTemplate = podcastTemplate
			.replace(/{{Title}}/g, title)
			.replace(/{{ImageURL}}/g, imageLink)
			.replace(/{{Description}}/g, desc)
			.replace(/{{Date}}/g, dateString)
			.replace(/{{Timestamp}}/g, Date.now().toString())
			.replace(/{{PodcastURL}}/g, podcastLink);
		return podcastTemplate;
	}

	addAtCursor(s: string) {
		let editor = this.getEditor();
		if (editor){
			let currentLine = editor.getCursor();
			editor.replaceRange(s, currentLine, currentLine);
		} else {
			new Notice("You have to be in the editor to do this.");
		}
	}

	getEditor() {
		let mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return mdView.editor;
	}

	addNewNote(s: string, title: string) {
		let fileName = this.settings.fileName
						.replace(/{{Title}}/g, title)
						.replace(/{{Timestamp}}/g, Date.now().toString())
						.replace(/{{Date}}/g, moment().format("YYYY-MM-DD"));
		fileName = fileName.replace(/[\\/:"*?<>|]*/g, '');
		this.app.vault.create(this.settings.folder + "/" + fileName + ".md", s);
		return fileName;
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
			if (this.plugin.settings.atCursor){
				this.plugin.insertPodcastNote(url);
			}else{
				this.plugin.addPodcastNote(url);
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
		containerEl.createEl('h2', { text: 'Settings for Podcast Note' });

		new Setting(containerEl)
			.setName('Template')
			.setDesc("you can define your own template. Available placeholders are: {{Title}}, {{ImageURL}}, {{Description}}, {{PodcastURL}}, {{Date}}, {{Timestamp}}")
			.addTextArea((textarea) => {
				textarea
					.setValue(this.plugin.settings.podcastTemplate)
					.onChange(async () => {
						this.plugin.settings.podcastTemplate = textarea.getValue();
						await this.plugin.saveSettings();
					});
				textarea.inputEl.rows = 10;
				textarea.inputEl.cols = 35;
			}
			);

		new Setting(containerEl)
			.setName('Folder')
			.setDesc('New Podcast Notes will be saved here (default: Vault folder)')
			.addTextArea(textarea => textarea
				.setValue(this.plugin.settings.folder)
				.setPlaceholder("example: Podcasts")
				.onChange(async () => {
					this.plugin.settings.folder = textarea.getValue();
					await this.plugin.saveSettings()
				})
			);

		new Setting(containerEl)
			.setName('Filename template')
			.setDesc('Filename template when "New note" is selected. Available placeholders are {{Title}}, {{Timestamp}}, {{Date}}')
			.addTextArea(textarea => textarea
				.setValue(this.plugin.settings.fileName)
				.onChange(async () => {
					this.plugin.settings.fileName = textarea.getValue()
					await this.plugin.saveSettings()
				})
			);

		new Setting(containerEl)
			.setName('Insert at cursor')
			.setDesc('Insert podcast note at cursor (default: create new note)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.atCursor)
				.onChange(async () => {
					this.plugin.settings.atCursor = toggle.getValue();
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl('hr');
		containerEl.createEl('p', { text: "Supported podcast services:" });
		let ul = containerEl.createEl('ul');
		ul.createEl("li", { text: "Apple" });
		ul.createEl("li", { text: "Spotify" });
		ul.createEl("li", { text: "Google" });
		ul.createEl("li", { text: "Pocket Casts" });
		ul.createEl("li", { text: "Airr" });
		ul.createEl("li", { text: "Overcast" });
		ul.createEl("li", { text: "Castro" });
	}
}