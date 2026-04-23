'use strict';

const express = require('express');
const http    = require('http');
const { WebSocketServer, OPEN } = require('ws');
const fs      = require('fs');
const path    = require('path');

const DATA = path.join(__dirname, 'data.json');
const PORT  = process.env.PORT || 3000;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

let jobs = [];
try { jobs = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch {}

function persist() {
  fs.writeFileSync(DATA, JSON.stringify(jobs));
}

function broadcast(payload, skip) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(c => {
    if (c !== skip && c.readyState === OPEN) c.send(msg);
  });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'sync', jobs }));

  ws.on('message', raw => {
    try {
      const { type, payload } = JSON.parse(raw);
      if (type === 'set' && Array.isArray(payload)) {
        jobs = payload;
        persist();
        broadcast({ type: 'sync', jobs }, ws);
      }
    } catch {}
  });
});

app.use(express.static(__dirname));

server.listen(PORT, '0.0.0.0', () => console.log(`Peak running on :${PORT}`));
