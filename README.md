<p align="center">
<img width="180" src="https://user-images.githubusercontent.com/67844154/159135750-7bfb6623-ba92-4344-9426-8a43ed2de379.png">
</p>

# Podcast Note

*Podcast Note* is a great way to write notes on podcasts. With a single URL you will get the title, image and description of your podcast.
Using a custom template you can style the note to your likings.
More settings and features will be explained further down.

## How to use it
You can add new podcast notes by opening the command pallete (cmd + p) and searching for "Podcast Note" commands:
### Add Podcast Note
A prompt will open where you can enter the URL for the podcast you want to take notes on. 
Of course you can also specify a keyboard shortcut to trigger the prompt.

### Add Podcast Notes from selection
This command will only be visible in editor mode. 
Make sure you have text selected which contains markdown links to podcast episodes. Running the command will create new podcast notes for every url in the selected text. It will also automatically link these notes.

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
- Podcast Addict
- YouTube

## Demo

### Example Podcast Note:

![Podcast Note example](https://user-images.githubusercontent.com/67844154/131222181-e9a52afa-fee2-4eff-83e1-f03deb633df3.png)

## Settings
### 1. Template
Here you can specify how the metadata for your podcast notes looks like. 
Use these three placeholders:
- `{{Title}}`       -> title of your podcast
- `{{ImageURL}}`    -> image url of your podcast
- `{{Description}}` -> short podcast description
- `{{ShowNotes}}`   -> show notes (only for PocketCasts and Castro)
- `{{EpisodeDate}}` -> date when podcast has been published (only for PocketCasts)
- `{{PodcastURL}}`  -> url to podcast
- `{{Date}}`        -> date (format: Day-Month-Year)
- `{{Timestamp}}`   -> current timestamp

#### Example template:
```
---
tags: [Podcast]
date: {{Date}}
---
# {{Title}} 
![]({{ImageURL}})
## Description: 
> {{Description}}
-> [Podcast Link]({{PodcastURL}})

## Notes:
```
**will create this note:**
<br><br>
<img width="900" alt="Podcast Note example editor" src="https://user-images.githubusercontent.com/67844154/132244681-e629ec06-a44a-4f8c-b9db-5a83576ad186.png">


### 2. Filename template
Specify whether the podcast note will be inserted at your cursor or whether a new note will be added.
You can also use a template for the filename.
Placeholders:
- `{{Title}}`       -> title of your podcast
- `{{Timestamp}}`   -> timestamp (like zettelkasten id)
- `{{Date}}`        -> date (format: Day-Month-Year)

### 3. Folder
Set the folder where new Podcast notes will be saved. The path is relative to your vault. For example `folder/podcast_folder` will become `path/to/vault/folder/podcastfolder`.

### 4. Insert podcast note at cursor
Specify whether you want to create a new note or whether you want the metadata to be inserted at your cursor.

## Questions
If you have any questions, feedback or feature requests, let me know and write a mail at [marc-julian.de](https://www.marc-julian.de) or create a new issue on <a href="https://github.com/marcjulianschwarz/obsidian-podcast-note">GitHub</a>

## Future versions will include:
See <a href="https://github.com/marcjulianschwarz/obsidian-podcast-note/issues">issues for Podcast Note</a>.

## Versions
The numbers in "[]" are the issue numbers associated with the fix or feature.

*1.0.0*: 
- Initital release.

*1.1.1*:
- [#7, #8] Bug fixes (custom folder was not working as expected, multiple occurrences of same placeholder didnt work)
- [#2, #5] New command: *Add Podcast Notes from selection*
    - fetches markdown links from selection
    - creates podcast note
    - replaces markdown link with link to podcast note

*1.1.2*:
- [#12] *Add Podcast Notes from selection* now working with pure links
- Podcast Note is now working on Obsidian mobile

*1.2.0*:
- [#15] Notes on YouTube videos is now possible
- [#14] Support for show notes (PocketCasts and Castro)

*1.3.0*:
- [#18] Fix ImageURL bug for mobile devices
- [#17] Add option to use markdown file as template
