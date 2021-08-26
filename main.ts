import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface PodcastNoteSettings {
	showImage: boolean,
	showDesc: boolean,
	podcastService: string,
	podcastTemplate: string
}

const DEFAULT_SETTINGS: PodcastNoteSettings = {
	showImage: true,
	showDesc: true,
	podcastService: "apple",
	podcastTemplate: "# {{Title}} \n {{Image}} \n ## Description: \n {{Description}} \n ## Notes: \n"
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
		let {contentEl} = this;
		let html = '<h3 style="margin-top: 0px;">Enter URL:</p><input type="text"/> <br><br><button>Add Podcast Note</button>';
		contentEl.innerHTML = html;

		contentEl.querySelector("button").addEventListener("click", () => {

			let url = contentEl.querySelector("input").value
			let response = this.getHttpsResponse(url);
			new Notice("Loading Podcast Info")
			response.then((result) => {

				let root = this.getParsedHtml(result);
				try {
					let podcast_info = this.getMetaDataForPodcast(root)
					this.addAtCursor(podcast_info)
				}catch{
					new Notice("This URL is not valid. Check settings.")
				}

			});
            this.close()
		});
	}

	getHttpsResponse(url: string){

		let host = "open.spotify.com"
		let podcast_path = url.split(host)[1]

		if (this.plugin.settings.podcastService == "apple"){
			host = "podcasts.apple.com"
			podcast_path = url.split(host)[1]
		}

		const https = require('https')
		const options = {
			hostname: host,
			port: 443,
			path: podcast_path,
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

	getParsedHtml(s){
		let parser = new DOMParser()
		let root = parser.parseFromString(s, "text/html")
		return root;
	}

	getMetaDataForPodcast(root){
		let title = ""
		let desc = ""
		let image_link = ""

		title = root.querySelector("meta[property='og:title']").getAttribute('content')

		if (this.plugin.settings.showDesc){
			desc = root.querySelector("meta[property='og:description']").getAttribute('content')
		}
		if (this.plugin.settings.showImage){
			image_link = root.querySelector("meta[property='og:image']").getAttribute('content')
			image_link = "![](" + image_link +  ")"
		}

		let podcastTemplate = this.plugin.settings.podcastTemplate
		podcastTemplate = podcastTemplate
							.replace("{{Title}}", title)
							.replace("{{Image}}", image_link)
							.replace("{{Description}}", desc)

		return podcastTemplate
	}


	addAtCursor(s: string){
		let mdView = this.app.workspace.activeLeaf.view;
        let doc = mdView.editor;
		var currentLine = doc.getCursor();
        doc.replaceRange(s, currentLine, currentLine);
	}

	onClose() {
		let {contentEl} = this;
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
		let {containerEl} = this;
		containerEl.empty();
		containerEl.createEl('h2', {text: 'Settings for Podcast Note'});

		new Setting(containerEl)
			.setName('Choose podcast service')
			.setDesc('Choose the podcast service you are using.')
			.addDropdown(dropdown => dropdown
				.addOptions({"apple": "Apple Podcast", 
							"spotify": "Spotify Podcast"})
				.setValue(this.plugin.settings.podcastService)
				.onChange(async () => {
					console.log(dropdown.getValue())
					this.plugin.settings.podcastService = dropdown.getValue();
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
				.setName('Template')
				.setDesc("you can define your own template.")
				.addTextArea(textarea => textarea
					.setValue(this.plugin.settings.podcastTemplate)
					.onChange(async () => {
						this.plugin.settings.podcastTemplate = textarea.getValue();
						await this.plugin.saveSettings();
					})
				)
				
		
		new Setting(containerEl)
			.setName('Add image')
			.setDesc('Will display podcast image when on.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showImage)
				.onChange(async () => {
					console.log(toggle.getValue());
					this.plugin.settings.showImage = toggle.getValue();
					await this.plugin.saveSettings();
				})
			)

		new Setting(containerEl)
			.setName('Add description')
			.setDesc('Will display podcast description when on.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showDesc)
				.onChange(async () => {
					console.log(toggle.getValue());
					this.plugin.settings.showDesc = toggle.getValue();
					await this.plugin.saveSettings();
				})
			)
	}
}