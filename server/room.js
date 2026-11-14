// Authoritative game room for online play. The server owns all state, timers,
// buzz order and answer checking; clients only render and send intents.
import { HINTS, PLAYER_COLORS, scoreFor, shuffle, TIMING } from '../src/lib/game.js'
import { isCorrectAnswer } from '../src/lib/hebrew.js'
import { hostLine } from '../src/lib/host.js'

export const MAX_PLAYERS = 8
const COUNTDOWN_MS = 3600
const CLIP_LEAD_MS = 450 // gives every device a moment to start in sync
const LOBBY_GRACE_MS = 30_000

let seqCounter = 0
const nextSeq = () => ++seqCounter

export class Room {
  constructor(code, songs, emit) {
    this.code = code
    this.songs = songs
    this.emit = emit // (event, payload) → broadcast to the room
    this.players = [] // ordered
    this.hostId = null
    this.settings = { target: 10, maxRounds: 15 }
    this.phase = 'lobby'
    this.timers = new Set()
    this.resetGame()
  }

  resetGame() {
    this.clearTimers()
    this.round = 0
    this.deck = []
    this.song = null
    this.locked = []
    this.hints = []
    this.answering = null
    this.outcome = null
    this.clip = null
    this.listenDeadline = 0
    this.clipStartAt = 0
    this.playLen = TIMING.clipSeconds
    this.buzzSec = 0
    this.line = ''
    this.mood = 'happy'
    for (const p of this.players) Object.assign(p, { score: 0, streak: 0, bestStreak: 0, correct: 0, buzzTimes: [] })
  }

  // ---------- timers ----------
  later(fn, ms) {
    const t = setTimeout(() => {
      this.timers.delete(t)
      fn()
    }, Math.max(0, ms))
    this.timers.add(t)
    return t
  }
  clearTimers() {
    for (const t of this.timers) clearTimeout(t)
    this.timers.clear()
  }

  // ---------- players ----------
  get(id) {
    return this.players.find((p) => p.id === id)
  }
  get connected() {
    return this.players.filter((p) => p.connected)
  }
  freeColor(preferred) {
    const used = new Set(this.players.map((p) => p.color))
    if (preferred && !used.has(preferred)) return preferred
    return (PLAYER_COLORS.find((c) => !used.has(c.hex)) || PLAYER_COLORS[this.players.length % PLAYER_COLORS.length]).hex
  }

  /** Adds a player (or reconnects an existing one). Returns { player } or { error }. */
  join({ id, name, color }) {
    const existing = this.get(id)
    if (existing) {
      existing.connected = true
      existing.offlineSince = null
      if (name && this.phase === 'lobby') existing.name = name
      if (!this.hostId || !this.get(this.hostId)?.connected) this.hostId = existing.id
      this.broadcast()
      return { player: existing }
    }
    if (this.phase !== 'lobby') return { error: 'המשחק בחדר הזה כבר התחיל' }
    if (this.players.length >= MAX_PLAYERS) return { error: `החדר מלא (עד ${MAX_PLAYERS} שחקנים)` }
    let finalName = name
    let n = 2
    while (this.players.some((p) => p.name === finalName)) finalName = `${name} ${n++}`
    const player = { id, name: finalName, color: this.freeColor(color), connected: true, offlineSince: null, score: 0, streak: 0, bestStreak: 0, correct: 0, buzzTimes: [] }
    this.players.push(player)
    if (!this.hostId) this.hostId = id
    this.say('lobbyJoin', { p: finalName }, true)
    this.broadcast()
    return { player }
  }

  update(id, { name, color }) {
    const p = this.get(id)
    if (!p || this.phase !== 'lobby') return
    if (name) p.name = name
    if (color && !this.players.some((q) => q.id !== id && q.color === color)) p.color = color
    this.broadcast()
  }

  leave(id) {
    this.players = this.players.filter((p) => p.id !== id)
    this.afterPlayerLoss(id)
  }

  disconnect(id) {
    const p = this.get(id)
    if (!p) return
    p.connected = false
    p.offlineSince = Date.now()
    if (this.phase === 'lobby') {
      this.later(() => {
        const q = this.get(id)
        if (q && !q.connected && this.phase === 'lobby') this.leave(id)
      }, LOBBY_GRACE_MS)
    }
    this.afterPlayerLoss(id)
  }

  afterPlayerLoss(id) {
    if (this.hostId === id || !this.get(this.hostId)?.connected) this.hostId = this.connected[0]?.id ?? this.players[0]?.id ?? null
    if (this.answering?.id === id) this.wrong(id, true)
    else if (this.phase === 'listening' && this.activeIds().length === 0 && this.song) this.reveal({ type: 'nobody' }, 'timeout', true)
    this.broadcast()
  }

  get empty() {
    return this.connected.length === 0
  }

  // ---------- settings / lifecycle ----------
  isHost(id) {
    return id === this.hostId
  }
  setSettings(id, s) {
    if (!this.isHost(id) || this.phase !== 'lobby') return
    if ([5, 10, 15, 20].includes(s.target)) this.settings.target = s.target
    if ([5, 10, 15, 20].includes(s.maxRounds)) this.settings.maxRounds = s.maxRounds
    this.broadcast()
  }

  start(id) {
    if (!this.isHost(id) || this.phase !== 'lobby') return { error: 'רק מנהל החדר יכול להתחיל' }
    if (this.connected.length < 2) return { error: 'צריך לפחות 2 שחקנים מחוברים' }
    this.resetGame()
    this.deck = shuffle(this.songs)
    this.phase = 'intro'
    const names = this.connected.map((p) => p.name)
    this.say('welcome', { a: names[0], b: names.slice(1).join(' ו') })
    this.emit('fx', { type: 'applause' })
    this.broadcast()
    this.later(() => this.beginRound(), 3800)
    return { ok: true }
  }

  backToLobby(id) {
    if (!this.isHost(id)) return
    this.resetGame()
    this.phase = 'lobby'
    this.players = this.players.filter((p) => p.connected)
    this.broadcast()
  }

  // ---------- round flow ----------
  activeIds() {
    return this.connected.filter((p) => !this.locked.includes(p.id)).map((p) => p.id)
  }
  get isFinal() {
    return this.round === this.settings.maxRounds
  }
  get gameOver() {
    return this.players.some((p) => p.score >= this.settings.target) || this.round >= this.settings.maxRounds
  }

  beginRound() {
    this.clearTimers()
    if (!this.deck.length) this.deck = shuffle(this.songs)
    this.song = this.deck.pop()
    this.round++
    this.locked = []
    this.hints = []
    this.answering = null
    this.outcome = null
    this.playLen = TIMING.clipSeconds
    this.phase = 'countdown'
    this.say(this.isFinal ? 'finalRound' : 'roundStart', { n: this.round })
    this.clipStartAt = Date.now() + COUNTDOWN_MS
    this.clip = this.clipFor(this.song.startSeconds, TIMING.clipSeconds, this.clipStartAt)
    this.nextUrl = this.deck.at(-1)?.audioSource.previewUrl ?? null
    this.emit('fx', { type: 'whoosh' })
    this.broadcast()
    this.later(() => {
      this.phase = 'listening'
      this.listenDeadline = this.clipStartAt + TIMING.listenWindow * 1000
      this.scheduleListenTimeout()
      this.broadcast()
    }, COUNTDOWN_MS)
  }

  clipFor(from, duration, startAt) {
    const a = this.song.audioSource
    return { seq: nextSeq(), url: a.previewUrl, trackId: a.trackId, from, duration, startAt }
  }

  scheduleListenTimeout() {
    if (this.listenTimer) {
      clearTimeout(this.listenTimer)
      this.timers.delete(this.listenTimer)
    }
    this.listenTimer = this.later(() => {
      if (this.phase === 'listening') {
        this.emit('fx', { type: 'aww' })
        this.reveal({ type: 'timeout' }, 'timeout', true)
      }
    }, this.listenDeadline - Date.now())
  }

  buzz(id) {
    const now = Date.now()
    if (this.phase !== 'listening' || now < this.clipStartAt || this.locked.includes(id) || !this.get(id)?.connected) return
    this.listenLeft = Math.max(0, this.listenDeadline - now)
    clearTimeout(this.listenTimer)
    this.timers.delete(this.listenTimer)
    if (!this.answering) this.buzzSec = (now - this.clipStartAt) / 1000
    this.openAnswer(id, false, now)
    this.clip = { seq: nextSeq(), stop: true }
    this.emit('fx', { type: 'buzz', playerId: id })
    this.say('buzz', { p: this.get(id).name })
    this.broadcast()
  }

  openAnswer(id, steal, now = Date.now()) {
    this.phase = 'answering'
    this.answering = { id, steal, deadline: now + TIMING.answerWindow * 1000 }
    if (this.answerTimer) {
      clearTimeout(this.answerTimer)
      this.timers.delete(this.answerTimer)
    }
    this.answerTimer = this.later(() => {
      if (this.phase === 'answering' && this.answering?.id === id) this.wrong(id, true)
    }, TIMING.answerWindow * 1000)
  }

  answer(id, alts) {
    if (this.phase !== 'answering' || this.answering?.id !== id) return
    const clean = (Array.isArray(alts) ? alts : [alts]).filter((a) => typeof a === 'string').map((a) => a.slice(0, 80)).slice(0, 6)
    if (clean.some((a) => isCorrectAnswer(a, this.song))) this.correct(id)
    else this.wrong(id, false, clean[0])
  }

  correct(id) {
    const p = this.get(id)
    const streakAfter = p.streak + 1
    const pts = scoreFor({ buzzSeconds: this.buzzSec, steal: this.answering?.steal, hintsUsed: this.hints.length, streakAfter, isFinal: this.isFinal })
    for (const q of this.players) {
      if (q.id === id) {
        q.score += pts.total
        q.streak = streakAfter
        q.bestStreak = Math.max(q.bestStreak, streakAfter)
        q.correct++
        if (!this.answering?.steal) q.buzzTimes.push(Math.round(this.buzzSec * 10) / 10)
      } else q.streak = 0
    }
    this.emit('fx', { type: 'correct', playerId: id, points: pts.total })
    this.reveal({ type: 'correct', playerId: id, name: p.name, color: p.color, points: pts }, streakAfter >= 3 ? 'streak' : 'correct', false, { p: p.name, s: streakAfter })
  }

  wrong(id, timedOut = false, said = '') {
    const p = this.get(id)
    this.emit('fx', { type: 'wrong', playerId: id, said: timedOut ? '' : said })
    if (!this.locked.includes(id)) this.locked.push(id)
    if (p) p.streak = 0
    this.answering = null
    const left = this.activeIds()
    const lead = hostLine(timedOut ? 'answerTimeout' : 'wrong')
    if (left.length === 1) {
      // last one standing gets the right to answer straight away
      const other = this.get(left[0])
      this.openAnswer(other.id, true)
      this.line = `${lead} ${hostLine('steal', { p: other.name })}`
      this.mood = 'sad'
      this.broadcast()
    } else if (left.length > 1) {
      // reopen the buzzers for everyone who hasn't missed yet
      this.phase = 'listening'
      this.listenDeadline = Date.now() + Math.max(this.listenLeft ?? 0, 8000)
      this.scheduleListenTimeout()
      this.line = `${lead} הזמזמים פתוחים לשאר השחקנים!`
      this.mood = 'sad'
      this.broadcast()
    } else {
      this.emit('fx', { type: 'aww' })
      this.reveal({ type: 'nobody' }, timedOut ? 'answerTimeout' : 'wrong', true)
    }
  }

  more(id) {
    if (!this.isHost(id) || this.phase !== 'listening') return
    this.playLen = Math.min(this.playLen + TIMING.moreSeconds, 26 - Math.min(this.song.startSeconds, 20))
    const startAt = Date.now() + CLIP_LEAD_MS
    this.clip = this.clipFor(this.song.startSeconds, this.playLen, startAt)
    this.listenDeadline = Math.max(this.listenDeadline, startAt + this.playLen * 1000 + 8000)
    this.scheduleListenTimeout()
    this.say('more', {})
    this.broadcast()
  }

  hint(id, key) {
    if (!['listening', 'answering'].includes(this.phase) || !this.get(id)) return
    const h = HINTS.find((x) => x.key === key)
    if (!h || this.hints.some((x) => x.key === key)) return
    this.hints.push({ key, value: h.value(this.song), by: this.get(id).name })
    this.emit('fx', { type: 'hint' })
    this.say('hint', {})
    this.broadcast()
  }

  skip(id) {
    if (!this.isHost(id) || !['listening', 'answering'].includes(this.phase)) return
    this.reveal({ type: 'skipped' }, 'skip')
  }

  reveal(outcome, lineKind, sad = false, vars = {}) {
    this.clearTimers()
    this.answering = null
    this.outcome = outcome
    this.phase = 'reveal'
    this.say(lineKind, vars, sad)
    this.clip = this.clipFor(Math.max(0, this.song.startSeconds - 3), TIMING.revealSeconds, Date.now() + CLIP_LEAD_MS)
    this.broadcast()
  }

  next(id) {
    if (!this.isHost(id) || this.phase !== 'reveal') return
    if (this.gameOver) {
      this.clearTimers()
      this.phase = 'end'
      this.clip = { seq: nextSeq(), stop: true }
      const ranked = [...this.players].sort((a, b) => b.score - a.score)
      const tie = ranked.length > 1 && ranked[0].score === ranked[1].score
      this.line = tie ? 'תיקו!!! אין מנצח, אבל יש הרבה כבוד. משחק חוזר?' : hostLine('winner', { p: ranked[0].name })
      this.emit('fx', { type: 'fanfare' })
      this.broadcast()
    } else this.beginRound()
  }

  say(kind, vars, sad = false) {
    this.line = kind === 'lobbyJoin' ? `${vars.p} הצטרף/ה לחדר! עכשיו זו כבר מסיבה.` : hostLine(kind, vars)
    this.mood = sad ? 'sad' : 'happy'
  }

  // ---------- public view ----------
  view() {
    const showSong = this.phase === 'reveal' || this.phase === 'end'
    const s = this.song
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      round: this.round,
      settings: this.settings,
      isFinal: this.isFinal,
      gameOver: this.gameOver,
      players: this.players.map(({ id, name, color, score, streak, bestStreak, correct, buzzTimes, connected }) => ({ id, name, color, score, streak, bestStreak, correct, buzzTimes, connected })),
      locked: this.locked,
      hints: this.hints,
      answering: this.answering,
      listenDeadline: this.listenDeadline,
      clipStartAt: this.clipStartAt,
      clip: this.clip,
      nextUrl: this.nextUrl,
      line: this.line,
      mood: this.mood,
      outcome: this.outcome,
      song: showSong && s ? { title: s.title, artist: s.artist, year: s.year, genre: s.genre, artwork: s.artwork, audioSource: { type: s.audioSource.type, trackId: s.audioSource.trackId } } : null,
      serverNow: Date.now(),
      ...(process.env.NHS_DEBUG && s ? { debugTitle: s.title } : {}),
    }
  }

  broadcast() {
    this.emit('room:state', this.view())
  }
}
