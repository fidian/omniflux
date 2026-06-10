import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const htmlFile = 'omniflux-split.html';
const scriptFile = 'omniflux-split.js';

export async function buildContent() {
    const html = await readFile(htmlFile, 'utf-8');
    const script = await readFile(scriptFile, 'utf-8');
    const merged = html.replace('##OMNIFLUX_SCRIPT##', script);

    return merged;
}
