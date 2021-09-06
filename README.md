# Podcast Note

*Podcast Note* is a great way to write notes on podcasts. With a single URL you will get the title, image and description of your podcast.
Using a custom template you can style the note to your likings.
More settings and features will be explained further down.

## How to use it
You can add a new podcast note by opening the command pallete (cmd + p) and selecting "Add Podcast Note".
A prompt will open where you can enter the URL for the podcast you want to take notes on. 
Of course you can also specify a keyboard shortcut to trigger the prompt.
### Supported Podcast services
So far these podcast services are supported:
- Apple Podcast
- Spotify Podcast
- Google Podcast
- Pocket Casts
- Airr
- Overcast
- Castro
- Castbox

## Demo


### Example Podcast Notes:
![Podcast Note example](https://user-images.githubusercontent.com/67844154/131222181-e9a52afa-fee2-4eff-83e1-f03deb633df3.png)


## Settings
### 1. Template
Here you can specify how the metadata for your podcast notes looks like. 
Use these three placeholders:
- `{{Title}}`       -> title of your podcast
- `{{ImageURL}}`    -> image url of your podcast
- `{{Description}}` -> short podcast description
- `{{PodcastURL}}`  -> url to podcast
- `{{Date}}`        -> date (format: Day-Month-Year Hours:Seconds)

### 2. New note template
Specify whether the podcast note will be inserted at your cursor or whether a new note will be added.
You can also use a template for the filename.
Placeholders:
- `{{Title}}`   -> title of your podcast
- `{{Date}}`    -> timestamp (like zettelkasten id)

### 3. Folder
Set the folder where new Podcast notes will be saved. The path is relative to your vault. For example `folder/podcast_folder/` will become `path/to/vault/folder/podcastfolder`.

### 4. Insert podcast note at cursor
Specify whether you want to create a new note or whether you want the metadata to be inserted at your cursor.

## Questions
If you have any questions, feedback or feature requests, let me know and write a mail at [marc-julian.de](https://www.marc-julian.de) or create a new issue on <a href="https://github.com/marcjulianschwarz/obsidian-podcast-note">GitHub</a>

Do you like the plugin?<br><br>
<a href="https://www.buymeacoffee.com/marcjulian" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Future versions will include:
- create podcast note from selection

## Versions
*1.0.0*: Initital release.


