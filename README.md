# Classic New Tab

Classic New Tab is a Chrome extension that replaces the default new tab page with a classic layout for apps, bookmarks, and most visited sites.

The extension keeps the current tab experience local and practical:

- shows Chrome apps and bookmark shortcuts;
- shows most visited sites as tiles;
- captures local thumbnails for visible most visited tiles;
- supports pinned and custom tiles;
- allows hiding, restoring, adding, and editing tiles;
- includes an options page for tile management and thumbnail cleanup.

## Installation for Testing

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory.
5. Open a new tab.

After changing source files, return to `chrome://extensions` and reload the extension.

## Privacy

Classic New Tab stores tile settings with Chrome extension storage. Thumbnails are captured from pages you visit and are stored locally in `chrome.storage.local`. The extension does not send thumbnails or browsing data to a server.

## License

Classic New Tab is distributed under the GNU General Public License, version 3 or later. See [LICENSE](LICENSE).

This project is based on MIT-licensed code from [NewTab Redirect](https://github.com/jimschubert/NewTab-Redirect). The original MIT notice is preserved in [LICENSE.ntp-redirect](LICENSE.ntp-redirect).

Bundled third-party components keep their own licenses:

- AngularJS: MIT License.
- jQuery: MIT License.
- Font Awesome: code under MIT License, fonts under SIL OFL 1.1.
- The new tab icon was released into the public domain by `tango!`.
