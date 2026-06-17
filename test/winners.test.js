import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanWinnerEntry } from '../functions/api/winners.js';

test('cleanWinnerEntry trims and normalizes a valid winner entry', () => {
  const entry = cleanWinnerEntry({
    winner: '  Team 1  ',
    members: '  Anna, Mads  ',
    score: '3',
    rounds: '6',
    teams: '4',
    standings: [{ name: 'Team 1', score: 3 }],
    date: '2026-06-17T19:40:02.762Z'
  });

  assert.deepEqual(entry, {
    winner: 'Team 1',
    members: 'Anna, Mads',
    score: 3,
    rounds: 6,
    teams: 4,
    standings: [{ name: 'Team 1', score: 3 }],
    photo: '',
    date: '2026-06-17T19:40:02.762Z'
  });
});

test('cleanWinnerEntry rejects missing winner names', () => {
  assert.throws(() => cleanWinnerEntry({ winner: '   ' }), /Winner name is required/);
});

test('cleanWinnerEntry keeps a valid compressed team photo', () => {
  const photo = `data:image/jpeg;base64,${'a'.repeat(128)}`;

  const entry = cleanWinnerEntry({
    winner: 'Team Photo',
    photo
  });

  assert.equal(entry.photo, photo);
});

test('cleanWinnerEntry rejects oversized team photos', () => {
  const photo = `data:image/png;base64,${'a'.repeat(700_000)}`;

  assert.throws(() => cleanWinnerEntry({ winner: 'Team Photo', photo }), /Team photo is too large/);
});
