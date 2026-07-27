import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { JSDOM, VirtualConsole } from "jsdom";

const htmlFile = "omniflux.html";
const cssFile = "omniflux.css";
const scriptFile = "omniflux.js";
const virtualConsole = new VirtualConsole();
virtualConsole.forwardTo(console, { jsdomErrors: "none" });

function insert(str, splitAt, insertStr) {
    const parts = str.split(splitAt);

    return `${parts[0].trim()}${insertStr.trim()}${splitAt}${(parts[1] ?? "").trim()}`;
}

export async function makeContent(makeBlank = false) {
    const { dom, document } = await loadDom();

    // Clean the HTML file in case an updated OmniWiki was copied over.  This
    // simplifies updating the documentation, as the HTML file can be copied
    // over without worrying about the embedded CSS and JS.
    for (const el of document.querySelectorAll(".of-core")) {
        el.remove();
    }

    // Remove blank lines within close body tag
    const bodyNodes = [...document.querySelector("body").childNodes];
    [bodyNodes[0], bodyNodes[bodyNodes.length - 1]].forEach((child) => {
        if (child.nodeType === 3 && child.textContent.trim() === "") {
            child.remove();
        }
    });

    // Update the application version (date string) to be YYYY.MM.DD
    document
        .querySelector("meta[name='version']")
        .setAttribute(
            "content",
            document
                .querySelector("#changelog li:first-child b")
                .innerHTML.replace(/-/g, ".")
        );
    document
        .querySelector("meta[name='build-time']")
        .setAttribute("content", new Date().toISOString());

    await writeFile(htmlFile, dom.serialize(), "utf-8");

    // Add CSS
    const css = await readFile(cssFile, "utf-8");
    const headEl = document.querySelector("head");
    const style = document.createElement("style");
    style.classList.add("of-core");
    style.textContent = css;
    headEl.appendChild(style);

    // Add JS
    const script = await readFile(scriptFile, "utf-8");
    const bodyEl = document.querySelector("body");
    const scriptEl = document.createElement("script");
    scriptEl.classList.add("of-core");
    scriptEl.type = "module";
    scriptEl.textContent = script;
    bodyEl.appendChild(scriptEl);

    if (makeBlank) {
        for (const el of document.querySelectorAll(
            "article, script:not(.of-core), style:not(.of-core)"
        )) {
            el.remove();
        }
        const articles = document.querySelector(".of-articles");
        const index = document.createElement("article");
        index.classList.add("index");
        index.innerHTML = "<h1>OmniFlux</h1>";
        articles.appendChild(index);

        const overview = document.createElement("article");
        overview.id = "overview";
        overview.innerHTML = '<p>Edit <a href="#overview">this page</a></p>';
        articles.appendChild(overview);

        document.querySelector(".of-index").innerHTML =
            '<p><a href="#overview">Overview</a></p>';
        document.querySelector('[data-of-transclude="#overview"]').innerHTML =
            overview.innerHTML;
    }

    return dom.serialize();
}

export async function getPageIds() {
    const { document } = await loadDom();
    const pageIds = [...document.querySelectorAll("article[id]")].map(
        (el) => el.id
    );

    return pageIds;
}

async function loadDom() {
    let html = await readFile(htmlFile, "utf-8");
    const dom = new JSDOM(html, { virtualConsole });

    return { dom, document: dom.window.document };
}
