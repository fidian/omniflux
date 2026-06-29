/**
 * Minification variables and functions
 */

const doc = document;
const pathname = location.pathname;

// Run a callback against all elements matching a selector.
// The only elements with IDs are articles.
const querySelectorAll = (selector, root = doc) =>
    root.querySelectorAll(selector);
const querySelector = (selector, root) => querySelectorAll(selector, root)[0];

const dom = (tag, content, attrs, ns) => {
    const el = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);

    for (const [key, value] of Object.entries(attrs || {})) {
        el.setAttribute(key, value);
    }

    const append = (child) => {
        if (Array.isArray(child)) {
            child.forEach(append);
        } else if (child) {
            el.append(
                typeof child === "string" ? doc.createTextNode(child) : child
            );
        }
    };

    append(content);

    return el;
};

const getAttribute = (el, attr) => el.getAttribute(attr);
const setAttributes = (el, attrs) => {
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
};
const cssEscape = (str) => CSS.escape(str);
const getArticle = (id) =>
    querySelector(`article${id ? `#${cssEscape(id)}` : ".index"}`);
const svgns = "http://www.w3.org/2000/svg";

// Add an event listener to a single element matching a selector.
const on = (selector, event, handler) =>
    querySelector(selector).addEventListener(event, handler);

// Set or remove a flag class on body.
const setFlag = (flag, value) => {
    doc.body.classList.toggle(`of_${flag}_flag`, !!value);
};

const wikiContent = () => {
    const copy = doc.documentElement.cloneNode(true);

    // Reset the sidebar to the default state
    querySelectorAll(".of_sidebar_bar [open]", copy).forEach((details) =>
        details.removeAttribute("open")
    );
    querySelector(".of_overview", copy).setAttribute("open", "");

    // Remove flag classes
    const classList = querySelector("body", copy).classList;
    [...classList].forEach((cls) => {
        if (cls.match(/^of_/)) {
            classList.remove(cls);
        }
    });

    // Clear search results, backlinks
    querySelectorAll(".of_search_results,.of_backlinks", copy).forEach(
        (el) => (el.innerHTML = "")
    );

    return `<!DOCTYPE html>\n${copy.outerHTML}\n`;
};

const suggestedFilename = () =>
    (pathname.split("/").pop() || doc.title).replace(
        /([-\d]*\.html?)?$/,
        `-${new Date()
            .toISOString()
            .replace(/[-:]|\..*/g, "")
            .replace("T", "-")}.html`
    );

// Convert an ID into a human readable name by replacing dashes and
// underscores with spaces, then capitalizing the first letter of each
// word.
const id2Name = (id) =>
    id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    doc.title;

const saveDone = () => {
    setFlag("dirty", 0);
    setFlag("saved", 1);
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => setFlag("saved", 0), 2000);
};

const autosaveAction = async () => {
    if (!autosaveFileHandle) {
        autosaveFileHandle = await window
            .showSaveFilePicker({
                suggestedName: suggestedFilename()
            })
            .catch(() => {});
    }

    if (autosaveFileHandle) {
        setFlag("autosave", 1);
        try {
            const writable = await autosaveFileHandle.createWritable();
            await writable.write(wikiContent());
            await writable.close();
            saveDone();
        } catch (err) {
            autosaveFileHandle = null;
            setFlag("autosave", 0);
            console.error("Autosave failed:", err);

            alert("Autosave failed. Check the console for details.");
        }
    }
};

const autoputAction = async () => {
    const fail = (msg) => {
        autoput = 0;
        setFlag("autoput", 0);
        console.error("WebDAV PUT failed:", msg);

        alert("WebDAV PUT failed. Check the console for details.");
    };

    try {
        const response = await fetch(pathname, {
            method: "PUT",
            body: wikiContent(),
            headers: {
                "Content-Type": "text/html"
            }
        });

        if (response.ok) {
            saveDone();
        } else {
            fail(await response.text());
        }
    } catch (err) {
        fail(err);
    }
};

/**
 * For rules and rule processing, see
 * https://fidian.github.io/omniflux/#rule-processing
 */
const processRules = (str, rules, preserve) => {
    let result = [];

    while (str) {
        let bestMatch = null;
        let bestHandler = null;

        for (const [regexp, handler] of rules) {
            const match = str.match(regexp);

            if (match && (!bestMatch || match.index < bestMatch.index)) {
                bestMatch = match;
                bestHandler = handler;
            }
        }

        let skip = bestMatch?.index ?? str.length;

        if (preserve && skip) {
            result.push(str.slice(0, skip));
        }

        if (bestMatch) {
            result.push(bestHandler(...bestMatch));
            str = str.slice(bestMatch.index + bestMatch[0].length);
        } else {
            str = "";
        }
    }

    return result;
};

const articleTitle = (articleEl) =>
    querySelector("h1,h2,h3,h4,h5,h6", articleEl)?.textContent.trim() ||
    id2Name(articleEl.id);

// Sorts an array of arrays, where item[0] is the title.
const sortArticleList = (a, b) =>
    a[0].localeCompare(b[0], undefined, { numeric: true });

// Creates a list of links to articles
const linksToArticles = (linkList) => {
    // Group by article
    const articles = new Map();
    for (const link of linkList) {
        const article = link.closest("article");
        const info = articles.get(article) || [
            articleTitle(article),
            article.id,
            []
        ];
        info[2].push(link);
        articles.set(article, info);
    }
    return [...articles.values()];
};

/**
 * Convert Markdown to HTML.
 */

const linkAttributes = {
    target: "_blank",
    rel: "noopener noreferrer"
};
const inlineRules = [
    [/`(.+?)`/, (_, txt) => dom("code", txt)],
    [/\*{3}(.+?)\*{3}/, (_, txt) => dom("b", dom("i", mdInline(txt)))],
    [/\*\*(.+?)\*\*/, (_, txt) => dom("b", mdInline(txt))],
    [/\*(.+?)\*/, (_, txt) => dom("i", mdInline(txt))],
    [/~~(.+?)~~/, (_, txt) => dom("s", mdInline(txt))],
    [/~(.+?)~/, (_, txt) => dom("u", mdInline(txt))],
    [
        // Images can be the source (to allow reuse without bloating the wiki)
        // that uses a data URL, a reference that uses the user-controlled
        // page ID, or a normal URL. When changed to HTML, references will instead
        // point to the hash of the image.
        //
        // ![alt1](data:image/png;base64,...)
        // <svg xmlns="..." width="800" height="600" viewBox="0 0 800 600"><title>alt1</title><image id="of_image_HASH" width="800" height="600" href="data:image/png;base64,..."/></svg>
        //
        // ![alt2](#page_ID)
        // <svg xmlns="..." class="of_image" width="800" height="600" viewBox="0 0 800 600"><title>alt2</title><use href="#of_image_HASH"/></svg>
        /!\[(.*?)\]\((.+?)\)/,
        (_, alt, src) => {
            if (src.startsWith("data:")) {
                const params = src
                    .split(";")
                    .slice(1, -1)
                    .reduce((acc, param) => {
                        const [key, value] = param.split("=");
                        acc[key] = value;
                        return acc;
                    }, {});

                if (params.id && params.width && params.height) {
                    return dom(
                        "svg",
                        [
                            dom("title", alt, {}, svgns),
                            dom(
                                "image",
                                "",
                                {
                                    id: params.id,
                                    width: params.width,
                                    height: params.height,
                                    href: src
                                },
                                svgns
                            )
                        ],
                        {
                            xmlns: svgns,
                            width: params.width,
                            height: params.height,
                            viewBox: `0 0 ${params.width} ${params.height}`
                        },
                        svgns
                    );
                }
            }

            if (src.startsWith("#")) {
                const elImage = querySelector(
                    `article#${cssEscape(src.slice(1))} svg image`
                );

                if (elImage) {
                    const width = getAttribute(elImage, "width");
                    const height = getAttribute(elImage, "height");
                    const id = getAttribute(elImage, "id");

                    if (width && height && id) {
                        return dom(
                            "svg",
                            [
                                dom("title", alt, {}, svgns),
                                dom("use", "", { href: `#${id}` }, svgns)
                            ],
                            {
                                xmlns: svgns,
                                class: "of_image",
                                width,
                                height,
                                viewBox: `0 0 ${width} ${height}`
                            },
                            svgns
                        );
                    }
                }
            }

            return dom("img", "", { src, alt, title: alt });
        }
    ],
    [
        // Support images inside links
        /\[((!\[.*?\]\(.+?\)|.)+?)\]\((.+?)\)/,
        (_, txt, _x, href) =>
            dom("a", mdInline(txt), {
                href,
                ...(href.startsWith("#") ? {} : linkAttributes),
                ...(href.startsWith("data:") ? { download: txt } : {})
            })
    ],
    [
        /(?<!\=["'])https?\:\/\/[^\s]+/i,
        (href) => dom("a", href, { href, ...linkAttributes })
    ]
];
const mdInline = (str) => processRules(str.trim(), inlineRules, 1);

const blockRules = [
    [/^ *-{3,} *$/m, () => ["\n", dom("hr"), "\n\n\n"]],
    [
        /^```([^\n]*)\n(([^\n]*\n)+?)```$/m,
        (_, lang, code) => [
            dom(
                "pre",
                dom("code", code, lang ? { class: `language-${lang}` } : {})
            ),
            "\n\n"
        ]
    ],
    [
        /^>( [^\n]+)?(\n>( [^\n]+)?)*$/m,
        (txt) => [
            "\n",
            dom("blockquote", ["\n\n", md2Dom(txt.replace(/^> ?/gm, ""))]),
            "\n\n"
        ]
    ],
    [
        /^(#+)([^\n]+)$/m,
        (_, h, txt) => ["\n", dom("h" + h.length, mdInline(txt)), "\n\n"]
    ],
    [
        /^( *(\d+\.|[-*+]) +[^\n]+(\n *(\d+\.|[-*+]) +[^\n]+)*)$/m,
        (all) => {
            // Convert the list item and handle task lists
            const listItem = (content) => {
                const taskMatch = content.match(/^\[([ xX])\] (.+)$/);
                return taskMatch
                    ? [
                          dom("input", "", {
                              type: "checkbox",
                              ...(taskMatch[1] !== " " ? { checked: "" } : {})
                          }),
                          " ",
                          mdInline(taskMatch[2].trim())
                      ]
                    : mdInline(content);
            };

            // Map all lines to an array of [indentSize, listType, content]
            const lines = all
                .split("\n")
                // Map lines to [fullMatch, listStyle, content]
                .map(
                    (line) =>
                        line.match(/^( *(?:\d+\.|[-*+]) +)(.+)$/) || [
                            "",
                            "",
                            line
                        ]
                )
                // Now change to [indentSize, listType, listDomNode]
                .map(([_, listStyle, content]) => [
                    listStyle.length,
                    listStyle.match(/\d/) ? "ol" : "ul",
                    [dom("li", listItem(content.trim())), "\n"]
                ]);

            const makeList = () => {
                const [indent, type] = lines[0];
                const content = ["\n"];

                while (lines.length && lines[0][0] >= indent) {
                    if (lines[0][1] === type && lines[0][0] === indent) {
                        content.push(lines.shift()[2]);
                    } else if (lines[0][0] > indent) {
                        content.push(makeList());
                    }
                }

                return [dom(type, content), "\n"];
            };

            return [makeList(), "\n"];
        }
    ],
    [
        // Tables
        /^\|[^\n]+\| *(\n\|[^\n]+\| *)+$/m,
        (all) => {
            const splitter = (line) =>
                line
                    .trim()
                    .slice(1, -1)
                    .trim()
                    .split(/ *\| */);
            const lines = all.trim().split("\n");
            const alignments = splitter(lines[1]).map((align) =>
                align.endsWith(":")
                    ? align.startsWith(":")
                        ? "center"
                        : "right"
                    : "left"
            );
            const headers = splitter(lines[0]);
            const rows = lines.slice(2).map((line) => splitter(line));
            const domRow = (tag, cells) =>
                dom(
                    "tr",
                    cells.map((cell, i) =>
                        dom(tag, mdInline(cell), {
                            align: alignments[i]
                        })
                    )
                );

            return [
                dom("table", [
                    "\n",
                    dom("thead", ["\n", domRow("th", headers), "\n"]),
                    "\n",
                    dom("tbody", [
                        "\n",
                        rows.map((cells) => [domRow("td", cells), , "\n"])
                    ]),
                    "\n"
                ]),
                "\n\n"
            ];
        }
    ],
    // Match custom elements and copy verbatim
    [
        /^<([a-z][a-z0-9]*(-[a-z0-9]+)+)( [^>]*)?>.*?<\/\1> *$/ims,
        (match) => {
            const e = dom("div");
            e.innerHTML = match;
            console.log(e);

            return [e.firstChild, "\n\n"];
        }
    ],
    [
        /^([^\n]+(\n[^\n]+)*)$/m,
        (all) => [
            dom(
                "p",
                all
                    .split("\n")
                    .flatMap((item, i) => [
                        ...(i ? [dom("br"), "\n"] : []),
                        mdInline(item)
                    ])
            ),
            "\n\n"
        ]
    ]
];
const md2Dom = (str) => processRules(`\n${str}\n`, blockRules);

// Include newlines for better git support
const md2Html = (str) => `\n${dom("div", md2Dom(str)).innerHTML.trim()}\n`;

/**
 * Convert HTML to Markdown. Must convert everything md2Dom supports.
 */

const html2MdConversions = [
    [/^HR$/, (add) => add("\n---\n\n\n", 1)],
    [/^(B|STRONG)$/, (add, currentNode) => add(`**${html2Md(currentNode)}**`)],
    [/^(I|EM)$/, (add, currentNode) => add(`*${html2Md(currentNode)}*`)],
    [/^(S|DEL)$/, (add, currentNode) => add(`~~${html2Md(currentNode)}~~`)],
    [/^U$/, (add, currentNode) => add(`~${html2Md(currentNode)}~`)],
    [/^(CODE|TT)$/, (add, currentNode) => add(`\`${html2Md(currentNode)}\``)],
    [
        /^A$/,
        (add, currentNode) => {
            const href = getAttribute(currentNode, "href");
            const text = html2Md(currentNode);
            add(href === text ? href : `[${text}](${href})`);
        }
    ],
    [
        /^IMG$/,
        (add, currentNode) =>
            add(
                `![${getAttribute(currentNode, "alt")}](${getAttribute(currentNode, "src")})`
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
        /^(UL|OL)$/,
        (add, currentNode) => {
            let parent = currentNode.parentElement;
            let indent = "";
            let tail = "\n\n";
            while (parent?.tagName.match(/^(UL|OL)$/)) {
                indent += "  ";
                parent = parent.parentElement;
                tail = "\n";
            }
            const listMd = html2Md(currentNode, 1);
            add(
                indent +
                    html2Md(currentNode, 1)
                        .trimEnd()
                        .replace(/\n/g, "\n" + indent) +
                    tail,
                1
            );
        }
    ],
    [
        /^LI$/,
        (add, currentNode) => {
            const parent = currentNode.parentElement;
            let prefix =
                parent.tagName === "OL"
                    ? `${[...parent.children].filter((node) => node.tagName === "LI").indexOf(currentNode) + 1}. `
                    : "- ";
            add(`${prefix}${html2Md(currentNode, 1)}\n`, 1);
        }
    ],
    [
        // Only allowed inside of a list item
        /^INPUT$/,
        (add, currentNode) => add(currentNode.checked ? "[x]" : "[ ]")
    ],
    [
        /^BLOCKQUOTE$/,
        (add, currentNode) =>
            add(`> ${html2Md(currentNode, 1).replace(/\n/g, "\n> ")}\n\n`, 1)
    ],
    [/^BR$/, (add, currentNode) => add("\n", 1)],
    [
        /^(P|DIV)$/,
        (add, currentNode) => add(html2Md(currentNode, 1) + "\n\n", 1)
    ],
    [
        /^TABLE$/,
        (add, currentNode) => {
            // [0] is maximum content length
            // [1] is alignment (string)
            // [2] is alignment length (left = 4, center = 6, right = 5)
            // [3] is the divider row text (---, :---, :---:, ---:)
            const colDef = [];
            const rows = [...querySelectorAll("tr", currentNode)].map((row) =>
                [...querySelectorAll("td, th", row)].map((cell, i) => {
                    const content = html2Md(cell, 1);
                    const def = colDef[i] || [3, "left"];
                    def[0] = Math.max(def[0], content.length);
                    def[1] = getAttribute(cell, "align") || def[1];
                    colDef[i] = def;
                    return content;
                })
            );
            const showRow = (row) =>
                `| ${row
                    .map((cell, i) => {
                        const len = cell.length;
                        const [want, , align] = colDef[i];
                        const gapLeft =
                            align > 5
                                ? Math.floor((want - len) / 2)
                                : align > 4
                                  ? want - len
                                  : 0;
                        return cell.padStart(len + gapLeft).padEnd(want);
                    })
                    .join(" | ")} |\n`;
            // Increase minimum width for 3 hyphens and necessary colons
            for (const def of colDef) {
                def[2] = def[1].length;
                def[0] = Math.max(def[0], def[2] - 1);
                def[3] = "-".repeat(def[0]);
                if (def[2] > 5) {
                    def[3] = ":" + def[3].slice(1);
                }
                if (def[2] > 4) {
                    def[3] = def[3].slice(0, -1) + ":";
                }
            }

            let result = showRow(rows.shift());
            result += `| ${colDef.map((def) => def[3]).join(" | ")} |\n`;

            for (const row of rows) {
                result += showRow(row);
            }

            add(result + "\n", 1);
        }
    ],
    [
        // SVG elements are in lowercase, hence "svg" and "/i" just in case
        /^svg$/i,
        (add, currentNode) => {
            const use = querySelector("use", currentNode);
            const title =
                querySelector("title", currentNode)?.textContent || "";

            if (use) {
                const article = querySelector(
                    `article:has(svg image#${cssEscape(getAttribute(use, "href").slice(1))})`
                );

                if (article) {
                    add(`![${title}](#${getAttribute(article, "id")})`);
                }
            } else {
                const image = querySelector("image", currentNode);

                if (image) {
                    add(`![${title}](${getAttribute(image, "href")})`);
                }
            }
        }
    ],
    // Preserve all custom elements
    [/-/, (add, currentNode) => add(currentNode.outerHTML + "\n\n", 1)],
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
    editing = true;
    setFlag("edit", 1);
    inputEl.focus();
};

const onLoad = () => {
    if (editing) {
        editing = false;
        setFlag("edit", 0);
    }

    querySelector("#of_sidebar_toggle").checked = false;
    currentId = location.hash.slice(1);
    currentArticleEl = getArticle(currentId);
    const usedBy = [
        currentId,
        querySelector("image[id]", currentArticleEl)?.getAttribute("id")
    ]
        .filter((x) => x != null) // Do not use !==
        .map((x) => `[href="#${cssEscape(x)}"]`)
        .join(",");
    const backLinks = [...querySelectorAll(`article:has(${usedBy})`)];
    querySelector(".of_backlinks").innerHTML = backLinks.length
        ? articleList(backLinks)
        : "No pages link here.";

    if (!currentArticleEl) editPage();
};

const doneEditing = () => {
    hashEl.innerHTML = "";
    editing = false;
    setFlag("edit", 0);

    // Handle pressing "Cancel" instead of creating a new page
    if (!currentArticleEl) location.hash = "";
};

const articleList = (articles) =>
    md2Html(
        [...articles]
            .map((article) => [
                querySelector(
                    "h1,h2,h3,h4,h5,h6",
                    article
                )?.textContent.trim() || id2Name(article.id),
                article.id
            ])
            .sort((a, b) =>
                a[0].localeCompare(b[0], undefined, { numeric: true })
            )
            .map(([title, id]) => `[${title}](#${id})`)
            .join("\n")
    );

const updateBrokenLinks = () => {
    const brokenLinks = [...querySelectorAll("article a[href^='#']")].filter(
        (a) => !getArticle(a.getAttribute("href").slice(1))
    );
    querySelector(".of_broken").innerHTML = linksToArticles(brokenLinks)
        .sort(sortArticleList)
        .map(
            ([title, id, links]) =>
                `<div><a href="#${id}">${title}</a><ul><li>${links.map((link) => link.outerHTML).join("</li><li>")}</li></ul></div>`
        )
        .join("\n");
    setFlag("broken", brokenLinks.length);
}

// Update everything after content is changed and saved.
const solidifyState = () => {
    // Copy HTML from elements, whose query selectors are in the
    // "data-of_transclude" attribute, to the elements with the
    // data-of_transclude attributes.
    querySelectorAll("[data-of_transclude]").forEach((el) => {
        el.innerHTML = querySelector(el.dataset.of_transclude)?.innerHTML || "";
    });
    querySelector(".of_index").innerHTML = md2Html(
        [...querySelectorAll("article")]
            .map((article) => [articleTitle(article), article.id])
            .sort(sortArticleList)
            .map(([title, id]) => `[${title}](#${id})`)
            .join("\n")
    );
    updateBrokenLinks();
    setFlag("dirty", 1);

    if (autosaveFileHandle) {
        autosaveAction();
    }

    if (autoput) {
        autoputAction();
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
        currentArticleEl = newArticle(currentId);
    }

    if (mdValue.length) {
        currentArticleEl.innerHTML = md2Html(mdValue);
    } else {
        // Delete the article
        currentArticleEl.remove();
        currentId = "";
    }

    location.hash = currentId;
    doneEditing();
    solidifyState();
};

const askForFile = (props, callback) => {
    const fileInput = dom("input", "", props);
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];

        if (file) {
            callback(file);
        }
    });
    fileInput.click();
};

const filenameToNewId = (name) => {
    if (getArticle(name)) {
        const [base, ext] = name.split(/(\.[^.]+$)/);
        let i = 1;
        do {
            name = `${base}_${i}${ext}`;
            i += 1;
        } while (getArticle(name));
    }

    return name;
};

const newArticle = (id) => {
    const el = dom("article", "", id ? { id } : {});
    articlesEl.append(el);
    return el;
};

const saveFile = (name, dataUrl, isImage) => {
    const id = filenameToNewId(name);
    const el = newArticle(id);

    el.innerHTML = md2Html(`# ${isImage ? "🖼" : "🖫"} ${name}

${isImage ? "!" : ""}[${name}](${dataUrl})`);
    location.hash = id;
    solidifyState();
};

const detectWebDAV = async () => {
    if (location.protocol.startsWith("http")) {
        const response = await fetch(pathname, { method: "OPTIONS" });
        if (response.headers.get("DAV")) {
            setFlag("webdav", 1);
        }
    }
};

/**
 * Get a list of elements that are manipulated more than once.
 *
 * Also, here is where the current state is tracked.
 */

const inputEl = querySelector(".of_input");
const hashEl = querySelector(".of_hash");
const articlesEl = querySelector(".of_articles");
const searchResultsEl = querySelector(".of_search_results");

let currentId = ""; // Current page ID, derived from URL hash
let currentArticleEl = null; // Current page's article element
let editing = false; // Whether the editor is open or not
let autosaveFileHandle; // If truthy, autosave is enabled
let autoput = 0; // If truthy, WebDAV-based autosave is enabled
let saveTimeout; // For showing the "saved" message
let searchTimeout; // For debounce

// Edit - this function is used when clicking the Edit button and
// when navigating to a page that doesn't exist
on(".of_edit", "click", editPage);

// Download
on(".of_download", "click", () => {
    const link = dom("a", "", {
        href: URL.createObjectURL(
            new Blob([wikiContent()], { type: "text/html" })
        ),
        download: suggestedFilename()
    });
    link.click();
    saveDone();
});

// Enable File API-based autosaving. When active, any change will automatically
// be saved to the local filesystem, overwriting the existing file.
on(".of_autosave", "click", () => {
    if (!window.showSaveFilePicker) {
        alert("File System Access API not supported in this browser.");
        return;
    }

    if (autosaveFileHandle) {
        autosaveFileHandle = null;
        setFlag("autosave", 0);
        return;
    }

    // Save immediately, which prompts the user for a file.
    autosaveAction();
});

// Enable WebDAV-based autosaving.
on(".of_autoput", "click", () => {
    autoput = !autoput;
    setFlag("autoput", autoput);
    autoputAction();
});

// Cancel editing
on(".of_cancel", "click", doneEditing);

// Save edits
on(".of_save", "click", saveEdits);

on(".of_put", "click", autoputAction);

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
    if (confirm("Are you sure you want to empty this wiki?")) {
        articlesEl.innerHTML = "";
        location.hash = "";
        currentArticleEl = newArticle();
        currentArticleEl.classList.add("index");
        currentArticleEl.innerHTML = `\n<h1>OmniFlux</h1>\n\n`;
        const overviewEl = newArticle("overview");
        overviewEl.innerHTML =
            '\n<p>Edit <a href="#overview">this page</a></p>\n\n';
        querySelectorAll("style:not(.of_core),script:not(.of_core)").forEach(
            (el) => el.remove()
        );
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
            if (getArticle(newId)) {
                alert("A page with that ID already exists.");
            } else {
                currentArticleEl.id = newId;
                location.hash = newId;
                querySelectorAll(`a[href="#${cssEscape(currentId)}"]`).forEach(
                    (a) => a.setAttribute("href", `#${newId}`)
                );
                solidifyState();
            }
        }
    }
});

// Load all articles from another copy of the wiki and replace any existing
// articles with matching IDs.
on(".of_import", "click", () => {
    askForFile({ type: "file", accept: "text/html" }, (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const parser = new DOMParser();
            const importedDoc = parser.parseFromString(
                event.target.result,
                "text/html"
            );
            querySelectorAll("article", importedDoc).forEach(
                (importedArticle) => {
                    getArticle(importedArticle.id)?.remove();
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
            doc.title = importedDoc.title;
            solidifyState();
        };
        reader.readAsText(file);
    });
});

// Upload a file into the wiki
on(".of_upload", "click", () => {
    askForFile({ type: "file" }, (file) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (file.type.startsWith("image/")) {
                const img = new Image();
                img.onload = async () => {
                    // Hash reader.result to get a unique ID
                    const binary = atob(reader.result.split(",")[1]);
                    const bytes = new Uint8Array(
                        [...binary].map((char) => char.charCodeAt(0))
                    );
                    const hashBuffer = crypto.subtle.digest("SHA-256", bytes);
                    const hashArray = Array.from(
                        new Uint8Array(await hashBuffer)
                    );
                    const hashHex = hashArray
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                    const id = `of_image_${hashHex}`;
                    let uri = reader.result.split(";");
                    uri.splice(
                        1,
                        0,
                        `id=${id}`,
                        `width=${img.width}`,
                        `height=${img.height}`
                    );
                    saveFile(file.name, uri.join(";"), true);
                };
                img.onerror = () => {
                    saveFile(file.name, reader.result);
                };
                img.src = reader.result;
            } else {
                saveFile(file.name, reader.result);
            }
        };
    });
});

// Searching
on(".of_search", "input", (event) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const value = event.target.value.trim().toLowerCase();

        if (!value.length) {
            searchResultsEl.innerHTML = "";
            return;
        }

        if (!value.match(/\w{3}/)) {
            searchResultsEl.innerHTML = "Not enough characters to search.";
            return;
        }

        const matchWords = value.split(/\s+/);
        searchResultsEl.innerHTML = articleList(
            [...querySelectorAll("article")].filter((article) => {
                const text = article.textContent.toLowerCase();
                return matchWords.every((word) => text.includes(word));
            })
        ) || "No results.";
    }, 300);
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

// Preserve checkbox state into HTML
document.addEventListener("change", ({ target }) => {
    // Skip the sidebar toggle
    if (target?.type === "checkbox" && !target.id) {
        target.toggleAttribute("checked", target.checked);
        solidifyState();
    }
});
onLoad();
updateBrokenLinks(); // of_broken_flag is not preserved during save

// Finally, show the buttons
setFlag("js", 1);

// Detect WebDAV support
detectWebDAV();
