import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const htmlFile = 'omniflux.html';
const cssFile = 'omniflux.css';
const scriptFile = 'omniflux.js';

function insert(str, splitAt, insertStr) {
    const parts = str.split(splitAt);

    return `${parts[0].trim()}${insertStr.trim()}${splitAt}${(parts[1] ?? '').trim()}`;
}

export async function buildContent(makeBlank = false) {
    const html = await readFile(htmlFile, 'utf-8');
    const css = await readFile(cssFile, 'utf-8');
    const script = await readFile(scriptFile, 'utf-8');
    let merged = insert(html, '</head>', `<style>\n${css.trim()}\n</style>`);
    merged = insert(merged, '</body>', `<script>\n${script.trim()}\n</script>`);

    if (makeBlank) {
        const pre = merged.split(/<article/).shift();
        const post = merged.split(/<\/article>/).pop();
        merged = `${pre}<article>Start your own Omniflux Wiki by editing this page.</article>${post}`;
    }

    return merged;
}
