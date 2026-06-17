function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function error(status, message) {
  return json({ error: message }, status);
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

export function cleanWinnerEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('Missing winner data');
  if (typeof entry.winner !== 'string' || !entry.winner.trim()) {
    throw new Error('Winner name is required');
  }

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

function rowToWinner(row) {
  return {
    winner: row.winner,
    members: row.members,
    score: row.score,
    rounds: row.rounds,
    teams: row.teams,
    standings: JSON.parse(row.standings || '[]'),
    photo: row.photo || '',
    date: row.date
  };
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT winner, members, score, rounds, teams, standings, photo, date FROM winners ORDER BY date DESC, id DESC'
  ).all();

  return json(results.map(rowToWinner));
}

export async function onRequestPost({ request, env }) {
  let entry;

  try {
    entry = cleanWinnerEntry(await request.json());
  } catch (caught) {
    return error(400, caught instanceof Error ? caught.message : 'Invalid winner data');
  }

  await env.DB.prepare(
    `INSERT INTO winners (winner, members, score, rounds, teams, standings, photo, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entry.winner,
      entry.members,
      entry.score,
      entry.rounds,
      entry.teams,
      JSON.stringify(entry.standings),
      entry.photo,
      entry.date
    )
    .run();

  return json(entry, 201);
}

export async function onRequestDelete({ env }) {
  await env.DB.prepare('DELETE FROM winners').run();
  return json([]);
}

export function onRequest() {
  return error(405, 'Method not allowed');
}
