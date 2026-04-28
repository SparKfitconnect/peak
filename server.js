'use strict';

const express = require('express');
const http    = require('http');
const { WebSocketServer, OPEN } = require('ws');
const fs      = require('fs');
const path    = require('path');

// DATA_PATH: set this env var on Render to point to a persistent disk directory.
// Without it, data lives in the repo folder and gets wiped on each redeploy.
const DATA_DIR = process.env.DATA_PATH || __dirname;
const DATA     = path.join(DATA_DIR, 'data.json');
const BACKUP   = path.join(__dirname, 'data.backup.json'); // always in repo as fallback
const PORT     = parseInt(process.env.PORT) || 3000;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── Load with backup fallback ─────────────────────────────────────────────────

let jobs = [];

function loadData() {
  for (const file of [DATA, BACKUP]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) { jobs = parsed; return; }
    } catch {}
  }
}
loadData();

// ── Persist to primary + backup ───────────────────────────────────────────────

function persist() {
  const json = JSON.stringify(jobs, null, 2);
  try { fs.writeFileSync(DATA,   json, 'utf8'); } catch (e) { console.error('[persist] primary failed:', e.message); }
  try { fs.writeFileSync(BACKUP, json, 'utf8'); } catch (e) { console.error('[persist] backup failed:',  e.message); }
}

setInterval(persist, 30_000);

// ── WebSocket ─────────────────────────────────────────────────────────────────

function broadcast(payload, skip) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(c => {
    if (c !== skip && c.readyState === OPEN) c.send(msg);
  });
}

// Heartbeat: ping every client every 30s. Any that don't pong get terminated.
// This cleans up ghost connections (closed tabs, sleeping phones, network drops).
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);
wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

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

// ── Routes ────────────────────────────────────────────────────────────────────

app.use(express.static(__dirname));

app.get('/health', (_req, res) => res.json({ ok: true, jobs: jobs.length }));

// ── Crash safety ──────────────────────────────────────────────────────────────

process.on('uncaughtException',  err => { console.error('[crash]', err); try { persist(); } catch {} });
process.on('unhandledRejection', err => { console.error('[crash]', err); try { persist(); } catch {} });
process.on('SIGTERM', () => { persist(); server.close(() => process.exit(0)); });

// ── Boot ──────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => console.log(`Peak running on :${PORT}`));
