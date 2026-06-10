import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const blankFile = 'blank.html';
const htmlFile = 'omniflux.html';
const cssFile = 'omniflux.css';
const scriptFile = 'omniflux.js';

function insert(str, splitAt, insertStr) {
    const parts = str.split(splitAt);

    return `${parts[0].trim()}${insertStr.trim()}${splitAt}${(parts[1] ?? '').trim()}`;
}

export async function buildContent(useBlank = false) {
    const html = await readFile(useBlank ? blankFile : htmlFile, 'utf-8');
    const css = await readFile(cssFile, 'utf-8');
    const script = await readFile(scriptFile, 'utf-8');
    let merged = insert(html, '</head>', `<style>\n${css.trim()}\n</style>`);
    merged = insert(merged, '</body>', `<script>\n${script.trim()}\n</script>`);
    return merged;
}
