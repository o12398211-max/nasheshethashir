// Sets startSeconds to the loudest 5s window of each preview (usually the chorus). Needs ffmpeg.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import os from 'node:os'; import path from 'node:path';
const file = new URL('../src/data/songs.json', import.meta.url);
const songs = JSON.parse(fs.readFileSync(file, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chorus-'));
for (const s of songs) {
  if (s.audioSource.type !== 'itunes' || s.startLocked) continue;
  const f = path.join(tmp, s.id + '.m4a');
  fs.writeFileSync(f, Buffer.from(await (await fetch(s.audioSource.previewUrl)).arrayBuffer()));
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1e8 });
  const sm = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const sec = []; for (let i = 0; i + 8000 <= sm.length; i += 8000) { let e = 0; for (let j = i; j < i + 8000; j++) e += sm[j] * sm[j]; sec.push(e / 8000); }
  let best = 2, bestE = -1;
  for (let t = 2; t + 5 <= sec.length - 3; t++) { const e = sec.slice(t, t + 5).reduce((a, b) => a + b, 0); if (e > bestE) { bestE = e; best = t; } }
  s.startSeconds = best; fs.rmSync(f);
  console.log(s.title, '->', best);
}
fs.writeFileSync(file, JSON.stringify(songs, null, 2));
