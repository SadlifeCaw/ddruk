const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, 'public');
const WINNERS_FILE = path.join(ROOT, 'winners.json');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Request body is too large');
  }
  return body ? JSON.parse(body) : {};
}

async function readWinners() {
  try {
    const raw = await fs.readFile(WINNERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeWinners(winners) {
  await fs.writeFile(WINNERS_FILE, JSON.stringify(winners, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': contentTypes['.json'] });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function cleanPhoto(photo) {
  if (typeof photo !== 'string' || !photo.trim()) return '';

  const value = photo.trim();
  if (!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
    throw new Error('Team photo must be a JPEG, PNG, or WebP data URL');
  }

  if (value.length > 650_000) {
    throw new Error('Team photo is too large');
  }

  return value;
}

function cleanWinnerEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('Missing winner data');
  if (typeof entry.winner !== 'string' || !entry.winner.trim()) throw new Error('Winner name is required');

  return {
    winner: entry.winner.trim().slice(0, 120),
    members: typeof entry.members === 'string' ? entry.members.trim().slice(0, 500) : '',
    score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : 0,
    rounds: Number.isFinite(Number(entry.rounds)) ? Number(entry.rounds) : 0,
    teams: Number.isFinite(Number(entry.teams)) ? Number(entry.teams) : 0,
    standings: Array.isArray(entry.standings) ? entry.standings : [],
    photo: cleanPhoto(entry.photo),
    date: entry.date || new Date().toISOString()
  };
}

async function handleApi(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname !== '/api/winners') {
    sendError(res, 404, 'Not found');
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, await readWinners());
    return;
  }

  if (req.method === 'POST') {
    const entry = cleanWinnerEntry(await readJsonBody(req));
    const winners = await readWinners();
    winners.unshift(entry);
    await writeWinners(winners);
    sendJson(res, 201, entry);
    return;
  }

  if (req.method === 'DELETE') {
    await writeWinners([]);
    sendJson(res, 200, []);
    return;
  }

  sendError(res, 405, 'Method not allowed');
}

async function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(STATIC_ROOT, relativePath);

  if (filePath !== STATIC_ROOT && !filePath.startsWith(STATIC_ROOT + path.sep)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(file);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendError(res, 404, 'Not found');
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    if (pathname.startsWith('/api/')) await handleApi(req, res);
    else await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error');
  }
});

server.listen(PORT, () => {
  console.log(`D-Druk game server running at http://localhost:${PORT}`);
  console.log(`Winners are saved in ${WINNERS_FILE}`);
});
