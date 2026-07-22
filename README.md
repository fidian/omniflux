# OmniFlux - Single-Page Wiki

OmniFlux is a self-contained wiki that runs from a single HTML file. It is designed to be simple, fast, and easy to deploy anywhere you can host or open an HTML file, without setting up a backend or database.

[DEMO: See it in action!](https://fidian.github.io/omniflux/)


## Features

* Everything is stored in one HTML file. Open it in your browser and start writing.
* No server, database, installation, or build step is required for normal use.
* Write pages in Markdown, including task lists, tables, wiki links, images, code fences, and email or URL autolinks.
* Save locally by downloading the current wiki, with optional browser File System Access API autosave when supported.
* Save to a server with WebDAV or HTTP `PUT` when your host supports it.
* Search, backlinks, broken-link detection, and a generated page index are built in.
* Uploaded files and images can be embedded directly in the wiki.
* CSS-based routing lets the wiki be browsed without JavaScript.


## Design Goals

* Simplicity: Anyone should be able to use the wiki without learning server administration.
* Portability: Keeping everything in one HTML file makes the wiki easy to share, archive, and deploy.
* Lightweight: There is no plugin system, complex configuration, or unnecessary framework.
* Git-friendly output: The saved HTML includes newlines, making `git diff` useful for tracking content changes.


## Alternatives

If you need a larger ecosystem or more customization, consider these:

* [TiddlyWiki](https://tiddlywiki.com/) - A more feature-rich single-page wiki with a plugin system and extensive customization options.
* [Feather Wiki](https://feather.wiki/) - A minimalist single-page wiki that focuses on simplicity and ease of use, but with fewer features than TiddlyWiki.

There is also a [page on the wiki](https://fidian.github.io/omniflux/#fair-comparison) that shows a fair comparison between OmniFlux and several other projects in the same space.


## How Did This Come About?

I started this wiki from [1.5KB Single-File Wiki](https://dev.to/fedia/15kb-single-file-wiki-46a1), which is where the CSS-based navigation comes from. One issue I had with that approach was that it kept two copies of each page in the HTML file, increasing the wiki size dramatically as content grew. To solve this, OmniFlux includes an HTML-to-Markdown converter, allowing the saved wiki to keep only one copy of each page. This pays for itself after adding only a few pages.

After that, the regular expressions were modified or rewritten to be more targeted, additional Markdown support was added, and features such as search, embedded files, a user-controlled overview, backlinks, broken-link detection, autosave, WebDAV upload, and page actions were added.

Oh, and tests now exist to make sure the Markdown converter works correctly, which is a nice bonus.


## License

OmniFlux is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for more details.
