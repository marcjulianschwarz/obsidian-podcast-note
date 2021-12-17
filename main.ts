import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, request, moment, htmlToMarkdown } from 'obsidian';

interface PodcastNoteSettings {
	podcastTemplate: string,
	atCursor: boolean,
	fileName: string,
	folder: string,
	templatePath: string
}

const DEFAULT_SETTINGS: PodcastNoteSettings = {
	podcastTemplate: "---\ntags: [Podcast]\ndate: {{Date}}\n---\n# {{Title}}\n![]({{ImageURL}})\n## Description:\n{{Description}}\n-> [Podcast Link]({{PodcastURL}})\n\n## Notes:\n",
	atCursor: false,
	fileName: "{{Title}} - Notes",
	folder: "",
	templatePath: ""
};

const hosts = {
	"spotify": "open.spotify.com",
	"apple": "podcasts.apple.com",
	"google": "podcasts.google.com",
	"pocketcasts": "pca.st",
	"airr": "www.airr.io",
	"overcast": "overcast.fm",
	"castbox": "castbox.fm",
	"castro": "castro.fm",
	"youtube": "youtube.com"
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
				this.addNotesFromSelection();
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

	// async getAirrQuoteTranscript(url: string){
	// 	let html = await this.getHtml(url);
	// 	let root = this.getParsedHtml(html);
	// 	let airrQuoteTranscript = root.querySelector(".quote_contextContainer__2afpx");
	// 	console.log(root);
	// }

	// ------------------
	// Utility functions
	// ------------------
	async loadHTML(url: string){
		try	{
			return await request({url: url, method: "GET"});
		} catch(reason){
			this.podcastError(url, "Couldnt load podcast data. No internet connection?");
			console.log("No connection, reason: \n" + reason);
			return undefined;
		}
	}

	parseHTML(s: string) {
		let parser = new DOMParser();
		let root = parser.parseFromString(s, "text/html");
		return root;
	}

	async loadEpisodeUUID(url: string){
		return await this.loadHTML(url)
	}

	checkPodcastURL(url: string) {
		if (new RegExp(Object.values(hosts).join("|")).test(url)) {
			return true;
		} else {
			new Notice("This podcast service is not supported.");
			return false;
		}
	}

	podcastError(url: string, msg: string){
		new Notice(msg);
		this.addNewNote("# Notes on podcast\n-> [Podcast Link](" + url + ")\n", "Default");
	}

	getEditor() {
		let mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return mdView.editor;
	}

	// ------------------
	// Add notes / Commands
	// ------------------

	addAtCursor(s: string) {
		let editor = this.getEditor();
		if (editor){
			let currentLine = editor.getCursor();
			editor.replaceRange(s, currentLine, currentLine);
		} else {
			new Notice("You have to be in the editor to do this.");
		}
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

	async addNotesFromSelection() {

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

	// ------------------
	// Load Podcast metadata
	// ------------------

	async getTitleAndPodcastString(url: string){
		new Notice("Loading Podcast Info");
		if (this.checkPodcastURL(url)){
				let html = await this.loadHTML(url);
				if (html){
					let root = this.parseHTML(html);
					return await this.getMetaDataForPodcast(root, url);
				} else{
					return {"title": "","podcastString": ""};
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


	async getMetaDataForPodcast(root: Document, url: string) {
		let date = moment().format("YYYY-MM-DD");
		let title = "Title not found";
		let desc = "Description not found";
		let imageLink = "";
		let showNotes = "";
		let episodeDate = "";

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
			} else if (url.includes(hosts.youtube)) {
				title = root.querySelector("title").innerHTML;
				desc = root.querySelector('#watch7-content > meta:nth-child(3)').getAttribute('content');
				//desc = root.querySelector(".ytd-video-secondary-info-renderer").innerHTML;
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			} else if (url.includes(hosts.pocketcasts)){
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				let script = root.querySelector("body > script").innerHTML;
				let regex = /EPISODE_UUID = '(.*)'/gm;
				let uuid = regex.exec(script);
				if (uuid){
					let json_notes = JSON.parse(await this.loadEpisodeUUID("https://cache.pocketcasts.com/share/episode/show_notes/" + uuid[1]))["show_notes"];
					showNotes = htmlToMarkdown(json_notes);
				}
				desc = root.querySelector("meta[property='og:description']").getAttribute('content');
				let episodeDateHTML = root.querySelector("#episode_date")
				if (episodeDateHTML){
					episodeDate = episodeDateHTML.innerHTML;
				}
				
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			} else if (url.includes(hosts.castro)){
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[property='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
				showNotes = htmlToMarkdown(root.querySelector(".co-supertop-castro-show-notes").innerHTML);
			} else {
				title = root.querySelector("meta[property='og:title']").getAttribute('content');
				desc = root.querySelector("meta[property='og:description']").getAttribute('content');
				imageLink = root.querySelector("meta[property='og:image']").getAttribute('content');
			}
		} catch (e) {
			console.log("Error parsing: " + url);
			console.log(e);
		}

		// Obsidian mobile can only transclude images with https urls
		if (!imageLink.startsWith("https")){
			imageLink = imageLink.replace("http", "https");
		}

		let podcastString = await this.applyTemplate(title, imageLink, desc, showNotes, episodeDate, date, url);
		return { "podcastString": podcastString, "title": title };
	}


	// ------------------
	// Apply Template
	// ------------------

	async getTemplatePath(){
		if (this.settings.templatePath != ""){
			let path = this.settings.templatePath
			if (!path.endsWith(".md")){
				path += ".md";
			}
			let file = this.app.metadataCache.getFirstLinkpathDest(path, '');
			return await this.app.vault.read(file)
		}else{
			return this.settings.podcastTemplate;
		}
	}

	async applyTemplate(title: string, imageLink: string, desc: string, showNotes: string, episodeDate: string, dateString: string, podcastLink: string) {
		let podcastTemplate = await this.getTemplatePath();
		podcastTemplate = podcastTemplate
			.replace(/{{Title}}/g, title)
			.replace(/{{ImageURL}}/g, imageLink)
			.replace(/{{Description}}/g, desc)
			.replace(/{{Date}}/g, dateString)
			.replace(/{{Timestamp}}/g, Date.now().toString())
			.replace(/{{PodcastURL}}/g, podcastLink)
			.replace(/{{ShowNotes}}/g, showNotes)
			.replace(/{{EpisodeDate}}/g, episodeDate);
		return podcastTemplate;
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
			.setDesc("Define your own template. Available placeholders are: {{Title}}, {{ImageURL}}, {{Description}}, {{ShowNotes}}, {{EpisodeDate}}, {{PodcastURL}}, {{Date}}, {{Timestamp}}")
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
			.setName("Template File")
			.setDesc("Define your own template in a .md file. Enter the path here (relative to vault)")
			.addTextArea(textarea => textarea 
				.setValue(this.plugin.settings.templatePath)
				.setPlaceholder("path/to/template")
				.onChange(async () => {
					this.plugin.settings.templatePath = textarea.getValue();
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Folder')
			.setDesc('New Podcast Notes will be saved here (default: Vault folder)')
			.addTextArea(textarea => textarea
				.setValue(this.plugin.settings.folder)
				.setPlaceholder("example: Podcasts")
				.onChange(async () => {
					this.plugin.settings.folder = textarea.getValue();
					await this.plugin.saveSettings();
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
		ul.createEl("li", { text: "YouTube" });
	}
}