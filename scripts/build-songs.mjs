// Builds src/data/songs.json from seed list using iTunes lookup (preview + artwork).
import fs from 'node:fs';
const lines = fs.readFileSync(new URL('./seed-songs.txt', import.meta.url), 'utf8').trim().split('\n');
const ids = lines.map(l => l.split('|')[0]);
const res = await (await fetch(`https://itunes.apple.com/lookup?id=${ids.join(',')}&country=il`)).json();
const byId = Object.fromEntries(res.results.map(r => [String(r.trackId), r]));
const songs = lines.map((l, i) => {
  const [trackId, title, artist, year, genre, difficulty, aliases] = l.split('|');
  const r = byId[trackId];
  if (!r) { console.warn('missing', trackId, title); return null; }
  return {
    id: `s${String(i + 1).padStart(3, '0')}`,
    title, artist, year: +year, genre, difficulty: +difficulty,
    aliases: aliases ? aliases.split(';').filter(Boolean) : [],
    audioSource: { type: 'itunes', trackId: +trackId, previewUrl: r.previewUrl },
    artwork: r.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null,
    startSeconds: 8,
  };
}).filter(Boolean);
fs.writeFileSync(new URL('../src/data/songs.json', import.meta.url), JSON.stringify(songs, null, 2));
console.log('wrote', songs.length, 'songs');
