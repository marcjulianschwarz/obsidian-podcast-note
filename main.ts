import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';

interface PodcastNoteSettings {
	podcastTemplate: string,
	atCursor: boolean,
	fileName: string,
	podcastService: string,
	folder: string
}

const DEFAULT_SETTINGS: PodcastNoteSettings = {
	podcastTemplate: "---\ntags: [Podcast]\ndate: {{Date}}\n---\n# {{Title}}\n![]({{ImageURL}})\n## Description:\n{{Description}}\n-> [Podcast Link]({{PodcastURL}})\n## Notes:\n",
	atCursor: false,
	fileName: "",
	podcastService: "apple",
	folder: ""
}

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
}


class PodcastNoteModal extends Modal {

	plugin: PodcastNote;

	constructor(app: App, plugin: PodcastNote) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {

		let { contentEl } = this;
		let html = '<h3 style="margin-top: 0px;">Enter podcast URL:</p><input type="text"/> <br><br><button>Add Podcast Note</button>';
		contentEl.innerHTML = html;

		contentEl.querySelector("button").addEventListener("click", () => {

			let url = contentEl.querySelector("input").value;

			let spotifyHost = "open.spotify.com";
			let appleHost = "podcasts.apple.com";
			let googleHost = "podcasts.google.com";
			let pocketcastsHost = "pca.st";
			let airrHost = "www.airr.io";
			let overcastHost = "overcast.fm";
			let castboxHost = "castbox.fm";
			let castroHost = "castro.fm";
			let listennotesHost = "www.listennotes.com";

			let host = "";
			let podcastPath = "";

			if (url.includes(spotifyHost)) {
				this.plugin.settings.podcastService = "spotify";
				host = spotifyHost;
			} else if (url.includes(appleHost)) {
				this.plugin.settings.podcastService = "apple";
				host = appleHost;
			} else if (url.includes(pocketcastsHost)){
				this.plugin.settings.podcastService = "pocketcasts";
				host = pocketcastsHost;
			} else if (url.includes(airrHost)){
				this.plugin.settings.podcastService = "airr";
				host = airrHost;
			} else if (url.includes(overcastHost)) {
				this.plugin.settings.podcastService = "overcast";
				host = overcastHost;
			} else if (url.includes(castboxHost)) {
				this.plugin.settings.podcastService = "castbox";
				host = castboxHost;
			} else if (url.includes(castroHost)) {
				this.plugin.settings.podcastService = "castro";
				host = castroHost;
			} else if (url.includes(googleHost)) {
				this.plugin.settings.podcastService = "google";
				host = googleHost;
			}
			
			
			else {
				new Notice("This is not a valid podcast Service.");
				this.close();
				return;
			}

			podcastPath = url.split(host)[1];

			let response = this.getHttpsResponse(host, podcastPath);

			new Notice("Loading Podcast Info");
			response.then((result) => {

				//try {
					let root = this.getParsedHtml(result);

					let podcastInfo = this.getMetaDataForPodcast(root, url);
					let title = podcastInfo[1];
					let podcastString = podcastInfo[0];

					if (this.plugin.settings.atCursor) {
						this.addAtCursor(podcastString);
					} else {
						let fileName = this.plugin.settings.fileName.replace("{{Title}}", title).replace("{{Date}}", Date.now().toString());
						this.addToNewNote(podcastString, fileName);
					}
				//} catch {
				//	new Notice("The URL is invalid.");
				//}
			})

			this.close();
		});
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
		console.log(root)
		return root;
	}

	getMetaDataForPodcast(root, url) {

		console.log(root)
		console.log(url)

		let d = new Date();
		let dateString = ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
		let title = "New Podcast Note"
		let desc = ""
		let imageLink = ""

		try {
			if (this.plugin.settings.podcastService == "apple") {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector(".product-hero-desc__section").querySelector("p").innerHTML;
				let artwork = root.querySelector(".we-artwork__source");
				imageLink = artwork.getAttribute('srcset').split(" ")[0];
			} else if (this.plugin.settings.podcastService == "airr") {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[name='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			} else if (this.plugin.settings.podcastService == "overcast") {
				title = root.querySelector("meta[name='og:title']").getAttribute('content');
				desc = root.querySelector("meta[name='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[name='og:image']").getAttribute('content');
			} else{
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[property='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			}
		} catch {
			console.log("Error parsing webpage.")
		}

		let podcastTemplate = this.applyTemplate(title, imageLink, desc, dateString, url);
		return [podcastTemplate, title];
	}

	applyTemplate(title, imageLink, desc, dateString, podcastLink) {
		let podcastTemplate = this.plugin.settings.podcastTemplate;
		podcastTemplate = podcastTemplate
			.replace("{{Title}}", title)
			.replace("{{ImageURL}}", imageLink)
			.replace("{{Description}}", desc)
			.replace("{{Date}}", dateString)
			.replace("{{PodcastURL}}", podcastLink);
		return podcastTemplate;
	}


	addAtCursor(s: string) {
		let mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let doc = mdView.editor;
		var currentLine = doc.getCursor();
		doc.replaceRange(s, currentLine, currentLine);
	}

	addToNewNote(s: string, fileName: string) {
		fileName = fileName.replace("/", "").replace("\\", "").replace(":", "").replace(":", "");
		this.app.vault.create(this.plugin.settings.folder + fileName + ".md", s);
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
		//containerEl.createEl('h2', {text: 'Settings for Podcast Note'});

		new Setting(containerEl)
			.setName('Podcast Service')
			.setDesc('Select your podcast service.')
			.addDropdown(dropdown => dropdown
				.addOptions({ 
								"apple": "Apple Podcast",
								"spotify": "Spotify Podcast",
								"google": "Google Podcast",
								"pocketcasts": "Pocket Casts",
								"airr": "Airr",
								"overcast": "Overcast",
								"castbox": "Castbox",
								"castro": "Castro"
							})
				.setValue(this.plugin.settings.podcastService)
				.onChange(async () => {
					this.plugin.settings.podcastService = dropdown.getValue()
					await this.plugin.saveSettings()
				})
			);


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
	}
}