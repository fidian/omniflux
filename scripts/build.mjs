#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { buildContent } from './build-content.mjs';
import { minify } from 'html-minifier-terser';

const outputFile = 'dist/index.html';
const outputFileMin = 'dist/minified/index.html';

main();

async function main() {
    await mkdir('dist');
    await mkdir('dist/minified/');
    const content = await buildContent();
    await writeFile(outputFile, content);
    console.log(`${outputFile} has been generated`);
    const minifiedContent = await minify(content, {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
    });
    await writeFile(outputFileMin, minifiedContent);
    console.log(`${outputFileMin} has been generated`);
}
