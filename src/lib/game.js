export const GENRES = {
  mizrahi: 'מזרחית',
  pop: 'פופ',
  rock: 'רוק',
  kids: 'שירי ילדים',
  eurovision: 'אירוויזיון',
  eretz: 'ארץ ישראלי',
  hiphop: 'היפ הופ',
}

export const PLAYER_COLORS = [
  { id: 'pink', name: 'ורוד', hex: '#ff2d95' },
  { id: 'cyan', name: 'טורקיז', hex: '#00e5ff' },
  { id: 'gold', name: 'זהב', hex: '#ffc53d' },
  { id: 'lime', name: 'ירוק', hex: '#7dff4d' },
  { id: 'violet', name: 'סגול', hex: '#b06bff' },
  { id: 'orange', name: 'כתום', hex: '#ff7a1a' },
]

export const TIMING = {
  clipSeconds: 5,
  moreSeconds: 5,
  listenWindow: 20,
  answerWindow: 12,
  revealSeconds: 15,
}

export function decadeLabel(year) {
  const d = Math.floor(year / 10) * 10
  return d < 2000 ? `שנות ה-${d % 100}` : `שנות ה-${d}`
}

export const HINTS = [
  { key: 'decade', label: 'עשור', icon: '📅', value: (s) => decadeLabel(s.year) },
  { key: 'genre', label: "ז'אנר", icon: '🎸', value: (s) => GENRES[s.genre] || s.genre },
  { key: 'letter', label: 'אות ראשונה', icon: '🔤', value: (s) => `"${[...s.title.trim()][0].toUpperCase()}"` },
  { key: 'artist', label: 'אמן', icon: '🎤', value: (s) => s.artist },
]

/** Points for a correct answer. */
export function scoreFor({ buzzSeconds, steal, hintsUsed, streakAfter, isFinal }) {
  let base = steal ? 1 : buzzSeconds <= 3 ? 3 : buzzSeconds <= 7 ? 2 : 1
  base = Math.max(1, base - hintsUsed)
  const streakBonus = streakAfter >= 3 ? 1 : 0
  const total = (base + streakBonus) * (isFinal ? 2 : 1)
  return { base, streakBonus, total, doubled: isFinal }
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const KEY_LABEL = (code) =>
  !code ? '' : code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : { Space: 'רווח', ShiftLeft: 'Shift שמאלי', ShiftRight: 'Shift ימני', ControlLeft: 'Ctrl שמאלי', ControlRight: 'Ctrl ימני', Enter: 'Enter', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' }[code] || code

export function storage(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
export function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
