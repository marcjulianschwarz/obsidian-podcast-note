import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

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

		// this.addCommand({
		// 	id: 'add-podcast-notes-from-list',
		// 	name: 'Add Podcast Notes from list',

		// 	editorCallback: () => {
		// 		this.addNotesFromList();
		// 	}
		// });
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

	addNotesFromList() {

		// let editor = this.getEditor();
		// let selection = editor.getSelection();
		// let words = selection.split(" ")

		// words = words.filter((value) => {
		// 	return value.includes("https://")
		// })

		// console.log(words)

		// let urls = selection.split("\n");
		// urls.forEach((url) => {
		// 	//console.log(url.replace("- ", ""))
		// 	this.addNoteFromModal(url.replace("- ", ""))
		// });

	}

	addNoteFromModal(url: string) {
		let { host, podcastPath } = this.getPodcastHostAndPath(url);
		let response = this.getHttpsResponse(host, podcastPath);

		new Notice("Loading Podcast Info");

		response.then((result) => {
			let root = this.getParsedHtml(result);
			let { title, podcastString } = this.getMetaDataForPodcast(root, url);
			this.makePodcastNote(podcastString, title);

		}).catch((reason) => {
			new Notice("Couldnt load podcast data. No internet connection?");
			this.makePodcastNote("# Notes on podcast\n-> [Podcast Link](" + url + ")\n", "Default");
			console.log("No connection, reason: \n" + reason);
		});
	}

	getPodcastHostAndPath(url: string) {

		let host = "";
		let podcastPath = "";

		if (url.includes(hosts.apple)) {
			host = hosts.apple;
		} else if (url.includes(hosts.spotify)) {
			host = hosts.spotify;
		} else if (url.includes(hosts.google)) {
			host = hosts.google;
		} else if (url.includes(hosts.overcast)) {
			host = hosts.overcast;
		} else if (url.includes(hosts.pocketcasts)) {
			host = hosts.pocketcasts;
		} else if (url.includes(hosts.castbox)) {
			host = hosts.castbox;
		} else if (url.includes(hosts.castro)) {
			host = hosts.castro;
		} else if (url.includes(hosts.airr)) {
			host = hosts.airr;
		} else {
			new Notice("This is not a valid podcast Service.");
			return;
		}

		podcastPath = url.split(host)[1];
		return { "host": host, "podcastPath": podcastPath };
	}

	getHttpsResponse(host: string, podcastPath: string) {
		const https = require('https');
		const options = {
			hostname: host,
			port: 443,
			path: podcastPath,
			method: 'GET',
			headers: { 'User-Agent': 'Mozilla/5.0' }
		}

		return new Promise((resolve, reject) => {
			https.request(options, res => {
				res.setEncoding('utf8');
				let body = '';
				res.on('data', chunk => body += chunk);
				res.on('end', () => resolve(body));
			}).on('error', reject).end();
		});
	}

	getParsedHtml(s) {
		let parser = new DOMParser();
		let root = parser.parseFromString(s, "text/html");
		return root;
	}

	getMetaDataForPodcast(root: Document, url: string) {
		let d = new Date();
		let dateString = ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
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

		let podcastString = this.applyTemplate(title, imageLink, desc, dateString, url);
		return { "podcastString": podcastString, "title": title };
	}

	applyTemplate(title, imageLink, desc, dateString, podcastLink) {
		let podcastTemplate = this.settings.podcastTemplate;
		podcastTemplate = podcastTemplate
			.replace("{{Title}}", title)
			.replace("{{ImageURL}}", imageLink)
			.replace("{{Description}}", desc)
			.replace("{{Date}}", dateString)
			.replace("{{PodcastURL}}", podcastLink);
		return podcastTemplate;
	}


	addAtCursor(s: string) {
		let editor = this.getEditor();
		var currentLine = editor.getCursor();
		editor.replaceRange(s, currentLine, currentLine);
	}

	getEditor() {
		let mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return mdView.editor;
	}

	addToNewNote(s: string, fileName: string) {
		fileName = fileName.replace("/", "").replace("\\", "").replace(":", "").replace(":", "");
		this.app.vault.create(this.settings.folder + fileName + ".md", s);
	}

	makePodcastNote(podcastString: string, title: string) {
		if (this.settings.atCursor) {
			this.addAtCursor(podcastString);
		} else {
			let fileName = this.settings.fileName.replace("{{Title}}", title).replace("{{Date}}", Date.now().toString());
			this.addToNewNote(podcastString, fileName);
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
			this.plugin.addNoteFromModal(url)
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

		// new Setting(containerEl)
		// 	.setName('Podcast Service')
		// 	.setDesc('Select your podcast service.')
		// 	.addDropdown(dropdown => dropdown
		// 		.addOptions({ 
		// 						"apple": "Apple Podcast",
		// 						"spotify": "Spotify Podcast",
		// 						"google": "Google Podcast",
		// 						"pocketcasts": "Pocket Casts",
		// 						"airr": "Airr",
		// 						"overcast": "Overcast",
		// 						"castbox": "Castbox",
		// 						"castro": "Castro"
		// 					})
		// 		.setValue(this.plugin.settings.podcastService)
		// 		.onChange(async () => {
		// 			this.plugin.settings.podcastService = dropdown.getValue()
		// 			await this.plugin.saveSettings()
		// 		})
		// 	);


		new Setting(containerEl)
			.setName('Template')
			.setDesc("you can define your own template. Available placeholders are: {{Title}}, {{ImageURL}}, {{Description}}, {{PodcastURL}}, {{Date}}")
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
				.setPlaceholder("Podcast Folder/")
				.onChange(async () => {
					this.plugin.settings.folder = textarea.getValue();
					await this.plugin.saveSettings()
				})
			);

		new Setting(containerEl)
			.setName('Filename template')
			.setDesc('Filename template when "New note" is selected. Available placeholders are {{Title}}, {{Date}}')
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