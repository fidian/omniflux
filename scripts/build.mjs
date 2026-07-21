#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { makeContent } from "./make-content.mjs";
import { minify } from "html-minifier-next";
import { JSDOM, VirtualConsole } from 'jsdom';

const noJekyllFile = "dist/.nojekyll";
const octocatFile = "dist/octocat.svg";
const virtualConsole = new VirtualConsole();
virtualConsole.forwardTo(console, { jsdomErrors: "none" });

main();

async function writeFileToDist(filename, content) {
    await writeFile(`dist/${filename}`, content);
    const size = (Buffer.byteLength(content, "utf8") / 1024).toFixed(1);
    console.log(`dist/${filename}: ${size} KB`);
}

async function buildFile(filename, tinyVersion) {
    let content = await makeContent(tinyVersion); // Can make a "blank" wiki

    if (tinyVersion) {
        content = await minify(content, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
            minifySVG: true,
            removeAttributeQuotes: true
        });
    }

    await writeFileToDist(filename, content);
}

function sizeOf(dom, selector) {
    let totalSize = 0;
    for (const element of dom.window.document.querySelectorAll(selector)) {
        totalSize += Buffer.byteLength(element.outerHTML, "utf8");
    }
    return totalSize;
}

async function analyzeFile(filename) {
    const content = await readFile(filename, "utf-8");
    const dom = new JSDOM(content, { virtualConsole });
    const size = Buffer.byteLength(content, "utf8");
    const jsSize = sizeOf(dom, 'script.of-core');
    const cssSize = sizeOf(dom, 'style.of-core');
    const articleSize = sizeOf(dom, 'article');
    const htmlSize = size - jsSize - cssSize - articleSize;
    console.log(`File: ${filename}`, {
        size,
        htmlSize,
        jsSize,
        cssSize,
        articleSize
    });
}

async function main() {
    await rm("dist", { recursive: true, force: true });
    await mkdir("dist/minified/", { recursive: true });
    await buildFile("index.html");
    await buildFile("minified/index.html", true);
    await writeFileToDist(".nojekyll", "");
    await writeFileToDist(
        "octocat.svg",
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"></path></svg>'
    );
    await writeFileToDist(
        "googled1a61b91d6079a30.html",
        'google-site-verification: googled1a61b91d6079a30.html'
    );
    await analyzeFile("dist/index.html");
    await analyzeFile("dist/minified/index.html");
}
