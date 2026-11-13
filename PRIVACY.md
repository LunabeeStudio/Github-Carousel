# Privacy policy

Last updated: November 13, 2026

PR Screenshot Carousel is a Chrome extension published by Lunabee Studio. This policy explains what the extension does with your data.

## Data the extension collects

None. The extension does not collect, transmit, sell or share any personal or usage data. It has no analytics, no tracking and no server.

## Data stored on your device

The extension saves three display settings: the slide unit, sync zoom, and whether to keep the zoom when changing slide. They are stored with Chrome sync storage (`chrome.storage.sync`). If you turn on Chrome sync, Chrome syncs them across your browsers through your Google account, as it does for any extension setting. Removing the extension deletes them.

## Pages the extension reads

The extension runs only on `github.com` pages. On pull request pages it reads the screenshot tables in the description and comments to build the carousel. It loads the full-size images from the same URLs GitHub already uses on the page. Nothing it reads leaves your browser.

## Permissions

- `storage`: saves the three settings above.
- Access to `https://github.com/*`: finds screenshot tables on pull request pages.

## Changes

Changes to this policy are published in this file, in the extension's public repository.

## Contact

Open an issue at https://github.com/LunabeeStudio/Github-Carousel/issues.
