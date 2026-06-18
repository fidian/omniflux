import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const htmlFile = 'omniflux.html';
const cssFile = 'omniflux.css';
const scriptFile = 'omniflux.js';

function insert(str, splitAt, insertStr) {
    const parts = str.split(splitAt);

    return `${parts[0].trim()}${insertStr.trim()}${splitAt}${(parts[1] ?? '').trim()}`;
}

export async function makeContent(makeBlank = false) {
    let html = await readFile(htmlFile, 'utf-8');

    // Clean the HTML file in case an updated OmniWiki was copied over.  This
    // simplifies updating the documentation, as the HTML file can be copied
    // over without worrying about the embedded CSS and JS.
    const modified = html.replace(/<style class="of_core">[\s\S]*?<\/style>/, '').replace(/<script type="module" class="of_core">[\s\S]*?<\/script>/, '');

    if (modified !== html) {
        await writeFile(htmlFile, modified, 'utf-8');
        html = modified;
    }

    const css = await readFile(cssFile, 'utf-8');
    const script = await readFile(scriptFile, 'utf-8');
    let merged = insert(html, '</head>', `<style class="of_core">\n${css.trim()}\n</style>`);
    merged = insert(merged, '</body>', `<script type="module" class="of_core">\n${script.trim()}\n</script>`);

    if (makeBlank) {
        const pre = merged.split(/<article/).shift();
        const post = merged.split(/<\/article>/).pop();
        merged = `${pre}<article class="index">\n<h1>OmniFlux</h1>\n\n</article><article id="overview">\n<p>Edit <a href="#overview">this page</a></p>\n\n</article>${post}`;
    }

    return merged;
}
