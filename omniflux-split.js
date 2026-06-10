{
    /**
     * Minification variables and functions
     */

    const doc = document;
    const createElement = (tag) => doc.createElement(tag);

    // Simple HTML escaping
    const htmlEncode = (str) => {
        const element = createElement("div");
        element.textContent = str;
        return element.innerHTML;
    };

    // Apply handlers to even/odd elements in an array and flatten the result.
    const evenOdd = (array, evenHandler, oddHandler) =>
        array.flatMap((item, i) =>
            i % 2 ? oddHandler(item) : evenHandler(item)
        );

    // Get an element by an ID. Used to find non-article elements.
    const getById = (id) => doc.getElementById(id);

    // Hide or show an element by toggling its display style.
    const toggleDisplay = (el) => {
        el.style.display = el.style.display === "none" ? "" : "none";
    };

    // Add an event listener
    const on = (el, event, handler) => el.addEventListener(event, handler);

    /**
     * Convert Markdown to HTML.
     */

    const md2HtmlInlines = [
        [/\*{3}(.+?)\*{3}/g, (_, txt) => `<b><i>${txt}</i></b>`],
        [
            /(\*{1,2}|~~)(.+?)\1/g,
            (_, c, txt) =>
                c == "*"
                    ? `<i>${txt}</i>`
                    : c == "**"
                      ? `<b>${txt}</b>`
                      : `<s>${txt}</s>`
        ],
        [/`(.+?)`/g, (_, txt) => `<code>${htmlEncode(txt)}</code>`],
        [
            /!\[(.*?)\]\((.+?)\)/g,
            (_, txt, url) => `<img src="${url}" alt="${txt}" title="${txt}">`
        ],
        [/\[(.+?)\]\((.+?)\)/g, (_, txt, url) => `<a href="${url}">${txt}</a>`],
        [
            /(?<!\=["'])https?\:\/\/[^\s]+/gi,
            (url) => `<a href="${url}">${url}</a>`
        ]
    ];
    const md2HtmlReplaceInlines = (str) =>
        md2HtmlInlines.reduce((md, rule) => md.replace(...rule), str.trim());
    const md2HtmlProcessList = (parts) => {
        const listType = parts[0].match(/^ *-/) ? "ul" : "ol";
        const listItems = [parts.shift()];

        while (parts[0] === "\n" && parts.length > 1) {
            parts.shift();
            listItems.push(parts.shift());
        }

        return `<${listType}>\n<li>${listItems
            .map((item) =>
                md2HtmlReplaceInlines(item.replace(/^ *(-|\d+\.)/, ""))
            )
            .join("</li>\n<li>")}</li>\n</${listType}>\n\n`;
    };
    // [0]: regex to match a block element with capturing groups
    // [1]: handler to process the block element, which can be
    // null. Returns the processed string and consumes
    // (function.length) tokens from the split result. Will be called
    // multiple times for multiple matches in the same string.
    // [2]: Optional handler to process the list of parts as an array.
    // Must modify the array in-place and will be called multiple times
    // until the items in the array are drained.
    const md2HtmlBlocks = [
        [
            /^```(?:[^\n]*)\n([\s\S]*?)\n```$/gm,
            (_, code) => `<pre><code>${htmlEncode(code)}</code></pre>\n\n`
        ],
        [
            /^(#+)([^\n]+)$/gm,
            (_, h, txt) =>
                `\n<h${h.length}>${md2HtmlReplaceInlines(txt)}</h${h.length}>\n\n`
        ],
        [/^( *\- *[^\n]+)$/gm, md2HtmlProcessList],
        [/^( *\d+\.[^\n]+)$/gm, md2HtmlProcessList],
        [
            // Embedded HTML is NOT supported
            /^([^<\n][^\n]*\n)+/gm,
            // FIXME: What does this replacement do? Why are there two spaces to replace?
            (_, txt) =>
                `<p>${md2HtmlReplaceInlines(
                    txt.replace(/  \n/g, "<br>\n")
                )}</p>\n\n`
        ]
    ];
    const md2html = (str) => {
        // Every odd index is processed, every even index can still
        // have a block rule applied to it.
        let input = [str];
        for (const [regex, handler] of md2HtmlBlocks) {
            input = evenOdd(
                input,
                (item) => {
                    const parts = item.split(regex);
                    const result = [parts.shift()];
                    while (parts.length) {
                        result.push(
                            handler(
                                parts,
                                ...parts.splice(0, handler.length - 1)
                            )
                        );
                        if (parts.length) {
                            result.push(parts.shift());
                        }
                    }
                    return result;
                },
                (item) => item
            );
        }

        return evenOdd(
            input,
            () => [],
            (x) => x
        )
            .join("")
            .trim();
    };

    /**
     * Convert HTML to Markdown. Must convert everything md2html supports.
     */

    // Convert HTML tags that match the pattern to Markdown.
    // [0]: regex to match the tag name
    // [1]: handler to process `currentNode` when the tag matches. Returns
    // the processed string. Must process all children of `currentNode`.
    const html2MdConversions = [
        [
            /^(B|STRONG)$/,
            (add, currentNode) => add(`**${html2md(currentNode)}**`)
        ],
        [/^(I|EM)$/, (add, currentNode) => add(`*${html2md(currentNode)}*`)],
        [/^(S|DEL)$/, (add, currentNode) => add(`~~${html2md(currentNode)}~~`)],
        [
            /^(CODE|TT)$/,
            (add, currentNode) => add(`\`${html2md(currentNode)}\``)
        ],
        [
            /^A$/,
            (add, currentNode) => {
                const href = currentNode.getAttribute("href");
                const text = html2md(currentNode);
                add(href === text ? href : `[${text}](${href})`);
            }
        ],
        [
            /^IMG$/,
            (add, currentNode) =>
                add(
                    `![${currentNode.getAttribute("alt")}](${currentNode.getAttribute("src")})`
                )
        ],
        [
            /^PRE$/,
            (add, currentNode) => {
                const codeChild = currentNode.querySelector("code");
                const codeContent = codeChild
                    ? codeChild.textContent
                    : currentNode.textContent;
                add(`\`\`\`\n${codeContent}\n\`\`\`\n\n`, 1);
            }
        ],
        [
            /^H[1-6]$/,
            (add, currentNode) =>
                add(
                    `\n${"#".repeat(parseInt(currentNode.tagName[1]))} ${html2md(currentNode, 1)}\n\n`,
                    1
                )
        ],
        [
            /^LI$/,
            (add, currentNode) => {
                const parent = currentNode.parentElement;
                const prefix =
                    parent.tagName === "OL"
                        ? `${[...parent.children].indexOf(currentNode) + 1}. `
                        : "- ";
                add(`${prefix}${html2md(currentNode, 1)}\n`, 1);
            }
        ],
        [/^BR$/, (add, currentNode) => add("\n", 1)],
        [
            /^(P|DIV|UL|OL)$/,
            (add, currentNode) => add(html2md(currentNode, 1) + "\n\n", 1)
        ],

        // Strip away all unknown tags but keep their content
        [/.*/, (add, currentNode) => add(html2md(currentNode))]
    ];

    // When inBlock is truthy, trim the markdown.
    function html2md(el, inBlock) {
        const treeWalker = doc.createTreeWalker(
            el,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
        );
        const add = (text, isBlock) => {
            if (trimFront && !isBlock) {
                text = text.trimStart();

                if (text.length) {
                    trimFront = 0;
                }
            }

            md += text;

            if (isBlock) {
                trimFront = 1;
            }
        };
        let md = "";
        let trimFront = inBlock;
        let currentNode = treeWalker.nextNode();

        while (currentNode) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                add(currentNode.textContent.replace(/\s+/g, " "));
                currentNode = treeWalker.nextNode();
            } else {
                for (const [regex, handler] of html2MdConversions) {
                    if (regex.test(currentNode.tagName)) {
                        handler(add, currentNode);
                        break;
                    }
                }

                currentNode = treeWalker.nextSibling();
            }
        }

        return inBlock
            ? md
                  .trim()
                  // collapse whitespace at the end of a line but not newlines
                  .replace(/[^\S\n]+([\n])/g, "$1")
                  .replace(/(\n{3})\n+/g, "$1")
            : md;
    }

    /**
     * Get a list of elements that are manipulated more than once.
     *
     * Also, here is where the current state is tracked.
     */

    const toolbarEl = getById("of_toolbar");
    const editorEl = getById("of_editor");
    const inputEl = getById("of_input");
    const hashEl = getById("of_hash");
    const articlesEl = getById("of_articles");

    let currentId = ""; // Current page ID, derived from URL hash
    let currentArticleEl = null; // Current page's article element

    /**
     * Attach event listeners and show the toolbar.
     */

    // Edit - this function is used when clicking the Edit button and
    // when navigating to a page that doesn't exist
    const edit = () => {
        hashEl.textContent = currentId;
        inputEl.value = currentArticleEl ? html2md(currentArticleEl, 1) : "";
        toggleDisplay(editorEl);
        inputEl.focus();
    };
    on(getById("of_edit"), "click", edit);

    // Set internal state when navigating to a new page or upon
    // initial load
    const onLoad = () => {
        currentId = location.hash.slice(1);
        currentArticleEl = doc.querySelector(
            `article${location.hash || ".index"}`
        );
        if (!currentArticleEl) edit();
    };
    on(window, "hashchange", onLoad);
    onLoad();

    // Download
    on(getById("of_download"), "click", () => {
        toggleDisplay(toolbarEl);
        const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
        const link = createElement("a");
        link.href = URL.createObjectURL(
            new Blob([html], { type: "text/html" })
        );
        link.download = (
            location.pathname.split("/").pop() || doc.title
        ).replace(
            /[-\d]*\.html$/,
            `-${new Date()
                .toISOString()
                .replace(/[-:]|\..*/g, "")
                .replace("T", "-")}.html`
        );
        link.click();
        toggleDisplay(toolbarEl);
    });

    // Cancel editing
    on(getById("of_cancel"), "click", () => {
        toggleDisplay(editorEl);
        if (!currentArticleEl) location.hash = "";
    });

    // Save edits
    on(getById("of_save"), "click", () => {
        const mdValue = inputEl.value;
        if (!currentArticleEl) {
            currentArticleEl = createElement("article");
            currentArticleEl.id = currentId;
            articlesEl.append(currentArticleEl);
        }
        if (mdValue.length) {
            // Surround with newlines to make it easy for block
            // level rules to work
            currentArticleEl.innerHTML = `\n${md2html(`\n${mdValue}\n`)}\n`;
            // FIXME - why assign twice?
            location.hash = "";
            location.hash = currentId;
        } else {
            currentArticleEl.remove();
            location.hash = "";
        }
        toggleDisplay(editorEl);
    });

    // Finally, show the toolbar
    toggleDisplay(toolbarEl);
}
