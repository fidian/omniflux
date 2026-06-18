/**
 * Minification variables and functions
 */

const doc = document;
const createElement = (tag) => doc.createElement(tag);

// Run a callback against all elements matching a selector.
// The only elements with IDs are articles.
const querySelectorAll = (selector, root = doc) =>
    root.querySelectorAll(selector);
const querySelector = (selector, root) => querySelectorAll(selector, root)[0];

// Add an event listener to a single element matching a selector.
const on = (selector, event, handler) =>
    querySelector(selector).addEventListener(event, handler);

// Hide or show elements that match a selector
const toggleHidden = (selector) =>
    querySelectorAll(selector).forEach((el) => el.classList.toggle("hidden"));
const toggleJsButtons = () => toggleHidden(".of_js");
const toggleEditor = () => {
    toggleHidden(".of_editor");
    editing = !editing;
};

const wikiContent = () => {
    // Restore state to a non-JS version of the wiki.
    toggleJsButtons();

    // Reset the sidebar to the default state
    querySelectorAll(".of_sidebar_bar [open]").forEach((details) =>
        details.removeAttribute("open")
    );
    querySelector(".of_overview").setAttribute("open", "");

    // Get content
    const result = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;

    // Go back to a JS-enabled version of the wiki.
    toggleJsButtons();

    return result;
};

const suggestedFilename = () =>
    (location.pathname.split("/").pop() || doc.title).replace(
        /([-\d]*\.html?)?$/,
        `-${new Date()
            .toISOString()
            .replace(/[-:]|\..*/g, "")
            .replace("T", "-")}.html`
    );

// Simple HTML escaping
const htmlEncode = (str) => {
    const element = createElement("div");
    element.textContent = str;
    return element.innerHTML;
};

// Convert an ID into a human readable name by replacing dashes and
// underscores with spaces, then capitalizing the first letter of each
// word.
const id2Name = (id) =>
    id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    doc.title;

const autosaveAction = async () => {
    if (!autosaveFileHandle) {
        autosaveFileHandle = await window
            .showSaveFilePicker({
                suggestedName: suggestedFilename()
            })
            .catch(() => {});
    }

    if (autosaveFileHandle) {
        const writable = await autosaveFileHandle.createWritable();
        await writable.write(wikiContent());
        await writable.close();
    }
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
    [/~(.+?)~/, (_, txt) => ["<u>", txt, "</u>"]],
    [
        /!\[(.*?)\]\((.+?)\)/,
        (_, txt, url) => `<img src="${url}" alt="${txt}" title="${txt}">`
    ],
    [
        /\[(.+?)\]\((.+?)\)/,
        (_, txt, url) => [
            `<a href="${url}"${url.startsWith("#") ? "" : ' target="blank" rel="noopener noreferrer"'}>`,
            txt,
            "</a>"
        ]
    ],
    [
        /(?<!\=["'])https?\:\/\/[^\s]+/i,
        (url) => [
            `<a href="${url}" target="blank" rel="noopener noreferrer">`,
            url,
            "</a>"
        ]
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
        (_, lang, code) => [
            `<pre><code${lang ? ` class="language-${lang}"` : ""}>${htmlEncode(code)}</code></pre>\n\n`
        ]
    ],
    [/^>( [^\n]+)?(\n>( [^\n]+)?)*$/m,
        (txt) => [`\n<blockquote>\n${md2Html(txt.replace(/^> ?/gm, ""))}</blockquote>\n\n`]
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
const md2Html = (str) => `\n${processRules(`\n${str}\n`, blockRules).trim()}\n`;

/**
 * Convert HTML to Markdown. Must convert everything md2html supports.
 */

const html2MdConversions = [
    [/^(B|STRONG)$/, (add, currentNode) => add(`**${html2Md(currentNode)}**`)],
    [/^(I|EM)$/, (add, currentNode) => add(`*${html2Md(currentNode)}*`)],
    [/^(S|DEL)$/, (add, currentNode) => add(`~~${html2Md(currentNode)}~~`)],
    [/^U$/, (add, currentNode) => add(`~${html2Md(currentNode)}~`)],
    [/^(CODE|TT)$/, (add, currentNode) => add(`\`${html2Md(currentNode)}\``)],
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
            const lang =
                codeTarget.className.match(/language-(\S+)/)?.[1] || "";
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
    [/^BLOCKQUOTE$/, (add, currentNode) => add(`> ${html2Md(currentNode, 1).replace(/\n/g, "\n> ")}\n\n`, 1)],
    [/^BR$/, (add, currentNode) => add("\n", 1)],
    [
        /^(P|DIV|UL|OL)$/,
        (add, currentNode) => add(html2Md(currentNode, 1) + "\n\n", 1)
    ],

    // Strip away all unknown tags but keep their content
    [/.*/, (add, currentNode) => add(html2Md(currentNode))]
];

// When inBlock is truthy, trim the markdown.
const html2Md = (el, inBlock) => {
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
};

/**
 * A few functions that bind to element events and that are reused.
 */
const editPage = () => {
    hashEl.textContent = "#" + currentId;
    inputEl.value = currentArticleEl ? html2Md(currentArticleEl, 1) : "";
    toggleEditor();
    inputEl.focus();
};

const onLoad = () => {
    if (editing) {
        toggleEditor();
    }

    querySelector("#of_sidebar_toggle").checked = false;
    currentId = location.hash.slice(1);
    currentArticleEl = doc.querySelector(`article${location.hash || ".index"}`);
    if (!currentArticleEl) editPage();
};

const doneEditing = () => {
    hashEl.innerHTML = "";
    toggleEditor();

    // Handle pressing "Cancel" instead of creating a new page
    if (!currentArticleEl) location.hash = "";
};

// Update everything after something is changed
const solidifyState = () => {
    // Copy HTML from elements, whose query selectors are in the
    // "data-of_transclude" attribute, to the elements with the
    // data-of_transclude attributes.
    querySelectorAll("[data-of_transclude]").forEach((el) => {
        el.innerHTML = querySelector(el.dataset.of_transclude)?.innerHTML || "";
    });

    // Rebuild the index using the first heading from each page.
    const mdLinks = [...querySelectorAll("article")].map(
        (article) =>
            `[${querySelector("h1,h2,h3,h4,h5,h6", article)?.textContent.trim() || id2Name(article.id)}](#${article.id})`
    );
    mdLinks.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    querySelector(".of_index").innerHTML = md2Html(mdLinks.join("\n"));

    if (autosaveFileHandle) {
        autosaveAction();
    }
};

const saveEdits = () => {
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
    } else {
        // Delete the article
        currentArticleEl.remove();
        currentId = "";
    }

    location.hash = currentId;
    solidifyState();
    doneEditing();
};

/**
 * Get a list of elements that are manipulated more than once.
 *
 * Also, here is where the current state is tracked.
 */

const inputEl = querySelector(".of_input");
const hashEl = querySelector(".of_hash");
const articlesEl = querySelector(".of_articles");

let currentId = ""; // Current page ID, derived from URL hash
let currentArticleEl = null; // Current page's article element
let editing = false; // Whether the editor is open or not
let autosaveFileHandle; // If truthy, autosave is enabled

// Edit - this function is used when clicking the Edit button and
// when navigating to a page that doesn't exist
on(".of_edit", "click", editPage);

// Download
on(".of_download", "click", () => {
    const link = createElement("a");
    link.href = URL.createObjectURL(
        new Blob([wikiContent()], { type: "text/html" })
    );
    link.download = suggestedFilename();
    link.click();
});

// Enable File API-based autosaving. When active, any change will automatically
// be saved to the local filesystem, overwriting the existing file.
on(".of_autosave", "click", () => {
    if (!window.showSaveFilePicker) {
        alert("File System Access API not supported in this browser.");
        return;
    }

    if (autosaveFileHandle) {
        alert("Disabling autosave.");
        autosaveFileHandle = null;
        return;
    }

    // Save immediately, which prompts the user for a file.
    autosaveAction();
});

// Cancel editing
on(".of_cancel", "click", doneEditing);

// Save edits
on(".of_save", "click", saveEdits);

on(".of_delete", "click", () => {
    inputEl.value = "";
    saveEdits();
});

on(".of_rename", "click", () => {
    const newTitle = prompt("Wiki name:", doc.title);
    if (newTitle) {
        doc.title = newTitle;
        solidifyState();
    }
});

on(".of_clear", "click", () => {
    if (confirm("Are you sure you want to remove all pages from the wiki?")) {
        querySelectorAll("article").forEach((article) => article.remove());
        location.hash = "";
        currentArticleEl = createElement("article");
        currentArticleEl.classList.add("index");
        currentArticleEl.innerHTML = `\n<h1>OmniFlux</h1>\n\n`;
        articlesEl.append(currentArticleEl);
        const overviewEl = createElement("article");
        overviewEl.id = "overview";
        overviewEl.innerHTML =
            '\n<p>Edit <a href="#overview">this page</a></p>\n\n';
        articlesEl.append(overviewEl);
        solidifyState();
    }
});

on(".of_change_id", "click", () => {
    if (!currentId) {
        alert("The main page can't change its ID.");
    } else {
        const newId = prompt(
            "This updates all links to this page.\n\nNew page ID:",
            currentId
        );

        if (newId && newId !== currentId) {
            if (doc.getElementById(newId)) {
                alert("A page with that ID already exists.");
            } else {
                currentArticleEl.id = newId;
                location.hash = newId;
                querySelectorAll(`a[href="#${currentId}"]`).forEach((a) =>
                    a.setAttribute("href", `#${newId}`)
                );
                solidifyState();
            }
        }
    }
});

// Load all articles from another copy of the wiki and replace any existing
// articles with matching IDs.
on(".of_import", "click", () => {
    const fileInput = createElement("input");
    fileInput.type = "file";
    fileInput.accept = "text/html";
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const parser = new DOMParser();
            const importedDoc = parser.parseFromString(
                event.target.result,
                "text/html"
            );
            querySelectorAll("article", importedDoc).forEach(
                (importedArticle) => {
                    querySelector(
                        `article${importedArticle.id ? `#${importedArticle.id}` : ".index"}`
                    )?.remove();
                    articlesEl.append(importedArticle);
                }
            );
            querySelectorAll("style:not(.of_core)", importedDoc).forEach(
                (style) => {
                    doc.head.appendChild(style);
                }
            );
            querySelectorAll("script:not(.of_core)", importedDoc).forEach(
                (script) => {
                    doc.body.appendChild(script);
                }
            );
            solidifyState();
        };
        reader.readAsText(file);
    });
    fileInput.click();
});

// Set internal state when navigating to a new page or upon
// initial load
window.addEventListener("hashchange", onLoad);
window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();

        if (editing) {
            saveEdits();
        } else {
            editPage();
        }
    }
});
onLoad();

// Finally, show the buttons
toggleJsButtons();
