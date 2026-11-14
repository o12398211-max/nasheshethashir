// Forgiving answer matching for Hebrew: ignores niqqud, punctuation, spaces,
// final-letter forms, and ktiv male/haser (ו/י), plus a leading definite article.
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }

export function normalize(str = '') {
  return str
    .normalize('NFD')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^a-z0-9א-ת]/g, '')
    .replace(/[וי]/g, '')
}

function variants(str) {
  const words = str.trim().split(/\s+/)
  const noArticle = words.map((w) => w.replace(/^ה(?=[א-ת]{2})/, '')).join(' ')
  const noThe = str.replace(/^the\s+/i, '')
  return [...new Set([str, noArticle, noThe].map(normalize))].filter(Boolean)
}

export function levenshtein(a, b) {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

const tolerance = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : Math.floor(len * 0.25))

/** True if `input` is an acceptable answer for `song` (title or one of its aliases). */
export function isCorrectAnswer(input, song) {
  const inputs = variants(input)
  const targets = [song.title, ...(song.aliases || [])].flatMap(variants)
  return inputs.some((u) =>
    targets.some((t) => u === t || (t.length >= 4 && u.includes(t)) || levenshtein(u, t) <= tolerance(t.length)),
  )
}

function light(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[^a-z0-9\u05d0-\u05ea ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Autocomplete suggestions from the song pool: title prefix, then word prefix, then contains. */
export function suggest(input, songs, limit = 6) {
  const q = light(input)
  if (!q) return []
  const scored = []
  const seen = new Set()
  for (const s of songs) {
    if (seen.has(s.title)) continue
    const names = [s.title, ...(s.aliases || [])].map(light)
    const t = names[0]
    let score = -1
    if (t.startsWith(q)) score = 0
    else if (t.split(' ').some((w) => w.startsWith(q))) score = 1
    else if (names.slice(1).some((a) => a.startsWith(q) || a.split(' ').some((w) => w.startsWith(q)))) score = 2
    else if (q.length >= 3 && names.some((n) => n.includes(q))) score = 3
    if (score >= 0) {
      seen.add(s.title)
      scored.push({ title: s.title, score })
    }
  }
  return scored.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, 'he')).slice(0, limit).map((x) => x.title)
}
