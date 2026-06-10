# OmniFlux - Single Page Wiki

Are you looking for a self-contained wiki that can be easily deployed on any web server? Look no further than OmniFlux! This single-page wiki is designed to be simple, fast, and easy to use, making it the perfect solution for anyone who wants to create a wiki without the hassle of setting up a complex backend.


## Features

* Everything's all in one HTML file. Just open it in your browser and start writing.
* No need for a server or a database.
* Supports a subset of Markdown for writing content.
* Uses CSS-based routing. This wiki can be browsed without JavaScript!


## Design Goals

* Simplicity: We wanted to create a wiki that anyone can use, regardless of their technical expertise.
* Portability: By keeping everything in a single HTML file, we made it easy to share and deploy the wiki on any web server.
* Lightweight: There's no plugin system, complex configuration, or unnecessary features.
* Git Friendly: The HTML includes newlines, making `git diff` work well for tracking changes to the wiki content.


## Alternatives

If you are looking for more features, I would recommend some of these:

* [TiddlyWiki](https://tiddlywiki.com/) - A more feature-rich single-page wiki with a plugin system and extensive customization options.
* [Feather Wiki](https://feather.wiki/) - A minimalist single-page wiki that focuses on simplicity and ease of use, but with fewer features than TiddlyWiki.


## Markdown Support

OmniFlux supports a subset of Markdown for writing content. You can use the following syntax:

* `# Heading 1` through `###### Heading 6` for headings
* `**bold**`, `*italic*`, `***bold+italics***`, and `~~strike~~` for text formatting
* `- list item` and `1. list item` for unordered and ordered lists
* `[link text](url)` for links, including internal links to other pages in the wiki (e.g., `[Page Name](#page-id)`)
* `![alt text](image url)` for images
* Backticks for inline code and triple backticks for fenced code blocks


## How Did This Come About?

I've created this wiki by starting with [1.5KB Single-File Wiki](https://dev.to/fedia/15kb-single-file-wiki-46a1), which is where the CSS-based navigation comes from. One issue I had was that this approach kept two copies of each page in the HTML file, which increases the size of the wiki dramatically as you add content. To solve this, I include a converter from HTML back to Markdown, allowing this wiki to only keep one copy of each page. This pays for itself after adding only a few pages.

After that, regular expressions were modified and more Markdown features were added.

Oh, and tests now exist to make sure the Markdown converter works correctly, which is a nice bonus.


## License

OmniFlux is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for more details.
