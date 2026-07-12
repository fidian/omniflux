#!/usr/bin/env node

// Serve OmniFlux as a single file by building it on the fly.
// Support WebDAV PUT requests to update the content of the wiki.

import { createServer } from 'node:http';
import { makeContent } from './make-content.mjs';
import { writeFile } from 'node:fs/promises';

const hostname = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

let mutexId = 0;
const waitingResolvers = [];
let currentMutexId = null;

function acquireMutex() {
    if (!currentMutexId) {
        currentMutexId = mutexId++;
        return Promise.resolve(currentMutexId);
    }

    return new Promise((resolve) => {
        waitingResolvers.push(resolve);
    });
}

function releaseMutex(mutexId) {
    if (mutexId !== currentMutexId) {
        throw new Error(`Release ID doesn't match current lock ID`);
    }

    if (waitingResolvers.length > 0) {
        const resolve = waitingResolvers.shift();
        currentMutexId = mutexId++;
        resolve(currentMutexId);
    } else {
        currentMutexId = null;
    }
}

const handler = async (req, res) => {
    switch (req.method) {
        case 'GET':
            const id = await acquireMutex();
            log('Reading files and merging contents');
            const merged = await makeContent();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(merged);
            releaseMutex(id);
            break;

        case 'HEAD':
            log('HEAD request');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end();
            break;

        case 'OPTIONS':
            log('OPTIONS request');
            res.writeHead(200, {
                'Allow': 'GET, HEAD, PUT, OPTIONS',
                'Content-Length': '0',
                'DAV': '1',
            });
            res.end();
            break;

        case 'PUT':
            const id2 = await acquireMutex();
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', async () => {
                log('Received PUT request with body length:', body.length);
                await writeFile("omniflux.html", body);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
                releaseMutex(id2);
            });
            break;

        default:
            log('Method not allowed', req.method);
            res.writeHead(405, { Allow: 'GET, HEAD' });
            res.end();
    }
};

createServer(handler).listen(port, hostname);
log(`Server running at http://${hostname}:${port}/`);
