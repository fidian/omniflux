{
    /**
     * Minification variables and functions
     */

    const doc = document;
    const createElement = (tag) => doc.createElement(tag);

    // Run a callback against all elements matching a selector.
    // The only elements with IDs are articles.
    const querySelectorAll = (selector, callback) =>
        doc.querySelectorAll(selector);

    // Add an event listener to one or more elements matching a selector.
    const on = (selector, event, handler) =>
        querySelectorAll(selector).forEach((el) =>
            el.addEventListener(event, handler)
        );

    // Hide or show elements that match a selector
    const toggleHidden = (selector) =>
        querySelectorAll(selector).forEach((el) =>
            el.classList.toggle("hidden")
        );
    const toggleJsButtons = () => toggleHidden('#of_toolbar');
    const toggleEditor = () => toggleHidden('#of_editor');

    // Simple HTML escaping
    const htmlEncode = (str) => {
        const element = createElement("div");
        element.textContent = str;
        return element.innerHTML;
    };

    /**
     * For rules and rule processing, see
     * https://fidian.github.io/omniflux/#rule-processing
     */
    const processRule = (str, regexp, handler) => {
        let result = [];
        let match = str.match(regexp);

        while (str && match) {
            const before = str.slice(0, match.index);
            const after = str.slice(match.index + match[0].length);
            const processed = handler(...match);
            if (Array.isArray(processed)) {
                result.push(before, ...processed);
                str = after;
            } else {
                str = before + processed + after;
            }
            match = str.match(regexp);
        }

        result.push(str);

        return result;
    };
    const processRules = (str, rules) => {
        let input = [str];

        for (const [regexp, handler] of rules) {
            input = input.flatMap((item, index) =>
                index % 2 ? item : processRule(item, regexp, handler)
            );
        }

        return input.join("");
    };

    /**
     * Convert Markdown to HTML.
     */

    const inlineRules = [
        [/`(.+?)`/, (_, txt) => [`<code>${htmlEncode(txt)}</code>`]],
        [/\*{3}(.+?)\*{3}/, (_, txt) => ["<b><i>", txt, "</i></b>"]],
        [/\*\*(.+?)\*\*/, (_, txt) => ["<b>", txt, "</b>"]],
        [/\*(.+?)\*/, (_, txt) => ["<i>", txt, "</i>"]],
        [/~~(.+?)~~/, (_, txt) => ["<s>", txt, "</s>"]],
        [
            /!\[(.*?)\]\((.+?)\)/,
            (_, txt, url) => `<img src="${url}" alt="${txt}" title="${txt}">`
        ],
        [
            /\[(.+?)\]\((.+?)\)/,
            (_, txt, url) => [`<a href="${url}">`, txt, "</a>"]
        ],
        [
            /(?<!\=["'])https?\:\/\/[^\s]+/i,
            (url) => [`<a href="${url}">`, url, "</a>"]
        ]
    ];
    const md2HtmlInline = (str) => processRules(str.trim(), inlineRules);
    const md2HtmlProcessList = (listType) => (lines) => [
        `<${listType}>\n<li>${lines
            .split("\n")
            .map((item) => md2HtmlInline(item.replace(/^ *([-*+]|\d+\.) +/, "")))
            .join(`</li>\n<li>`)}</li>\n</${listType}>\n\n`
    ];
    const blockRules = [
        [
            /^```([^\n]*)\n(([^\n]*\n)+?)```$/m,
            (_, lang, code) => [`<pre><code${lang ? ` class="language-${lang}"` : ''}>${htmlEncode(code)}</code></pre>\n\n`]
        ],
        [
            /^(#+)([^\n]+)$/m,
            (_, h, txt) => [
                `\n<h${h.length}>${md2HtmlInline(txt)}</h${h.length}>\n\n`
            ]
        ],
        [/^( *[-*+] +[^\n]+(\n *[-*+] +[^\n]+)*)$/m, md2HtmlProcessList("ul")],
        [/^( *\d+\. +[^\n]+(\n *\d+\. +[^\n]+)*)$/m, md2HtmlProcessList("ol")],
        [
            /^([^\n]+(\n[^\n]+)*)$/m,
            (all) => [
                "<p>",
                ...all
                    .split("\n")
                    .flatMap((item) => [md2HtmlInline(item), "<br>\n"])
                    .slice(0, -1),
                "</p>\n\n"
            ]
        ],
        [/\n+/, () => ""]
    ];
    // Surround with newlines to make it easy for block level rules to work.
    // Add newlines for easier diffing with git.
    const md2Html = (str) =>
        `\n${processRules(`\n${str}\n`, blockRules).trim()}\n`;

    /**
     * Convert HTML to Markdown. Must convert everything md2html supports.
     */

    const html2MdConversions = [
        [
            /^(B|STRONG)$/,
            (add, currentNode) => add(`**${html2Md(currentNode)}**`)
        ],
        [/^(I|EM)$/, (add, currentNode) => add(`*${html2Md(currentNode)}*`)],
        [/^(S|DEL)$/, (add, currentNode) => add(`~~${html2Md(currentNode)}~~`)],
        [
            /^(CODE|TT)$/,
            (add, currentNode) => add(`\`${html2Md(currentNode)}\``)
        ],
        [
            /^A$/,
            (add, currentNode) => {
                const href = currentNode.getAttribute("href");
                const text = html2Md(currentNode);
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
                const codeTarget = currentNode.querySelector("code") || currentNode;
                const codeContent = codeTarget.textContent;
                const lang = codeTarget.className.match(/language-(\S+)/)?.[1] || "";
                add(`\`\`\`${lang}\n${codeContent}\`\`\`\n\n`, 1);
            }
        ],
        [
            /^H[1-6]$/,
            (add, currentNode) =>
                add(
                    `\n${"#".repeat(parseInt(currentNode.tagName[1]))} ${html2Md(currentNode, 1)}\n\n`,
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
                add(`${prefix}${html2Md(currentNode, 1)}\n`, 1);
            }
        ],
        [/^BR$/, (add, currentNode) => add("\n", 1)],
        [
            /^(P|DIV|UL|OL)$/,
            (add, currentNode) => add(html2Md(currentNode, 1) + "\n\n", 1)
        ],

        // Strip away all unknown tags but keep their content
        [/.*/, (add, currentNode) => add(html2Md(currentNode))]
    ];

    // When inBlock is truthy, trim the markdown.
    function html2Md(el, inBlock) {
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
     * A few functions that bind to element events and that are reused.
     */
    const editPage = () => {
        hashEl.textContent = currentId;
        inputEl.value = currentArticleEl ? html2Md(currentArticleEl, 1) : "";
        toggleEditor();
        inputEl.focus();
    };

    const onLoad = () => {
        currentId = location.hash.slice(1);
        currentArticleEl = doc.querySelector(
            `article${location.hash || ".index"}`
        );
        if (!currentArticleEl) editPage();
    };

    const doneEditing = () => {
        hashEl.innerHTML = "";
        toggleEditor();

        // Handle pressing "Cancel" instead of creating a new page
        if (!currentArticleEl) location.hash = "";
    }

    /**
     * Get a list of elements that are manipulated more than once.
     *
     * Also, here is where the current state is tracked.
     */

    const inputEl = querySelectorAll('#of_input')[0];
    const hashEl = querySelectorAll('#of_hash')[0];
    const articlesEl = querySelectorAll('#of_articles')[0];

    let currentId = ""; // Current page ID, derived from URL hash
    let currentArticleEl = null; // Current page's article element

    // Edit - this function is used when clicking the Edit button and
    // when navigating to a page that doesn't exist
    on("#of_edit", "click", editPage);

    // Download
    on("#of_download", "click", () => {
        toggleJsButtons();
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
        toggleJsButtons();
    });

    // Cancel editing
    on("#of_cancel", "click", doneEditing);

    // Save edits
    on("#of_save", "click", () => {
        const mdValue = inputEl.value;
        if (!currentArticleEl) {
            // When creating a new element, change the hash so the browser's :target
            // selector will show the new page after it's added to the DOM. It does
            // not find the element otherwise. This line is also necessary to show
            // something useful after deleting a page.
            location.hash = "";
            currentArticleEl = createElement("article");
            currentArticleEl.id = currentId;
            articlesEl.append(currentArticleEl);
        }
        if (mdValue.length) {
            currentArticleEl.innerHTML = md2Html(mdValue);
            location.hash = currentId;
        } else {
            // Delete the article
            currentArticleEl.remove();
        }
        doneEditing();
    });

    // Set internal state when navigating to a new page or upon
    // initial load
    window.addEventListener("hashchange", onLoad);
    onLoad();

    // Finally, show the buttons
    toggleJsButtons();
}
