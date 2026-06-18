#!/usr/bin/env node

import { createServer } from 'node:http';
import { makeContent } from './make-content.mjs';

const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;

function log(...args) {
    console.log(new Date().toISOString(), ...args);
}

const handler = async (req, res) => {
    switch (req.method) {
        case 'GET':
            log('Reading files and merging contents');
            const merged = await makeContent();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(merged);
            break;

        case 'HEAD':
            log('HEAD request');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end();
            break;

        default:
            log('Method not allowed', req.method);
            res.writeHead(405, { Allow: 'GET, HEAD' });
            res.end();
    }
};

createServer(handler).listen(port, hostname);
log(`Server running at http://${hostname}:${port}/`);
