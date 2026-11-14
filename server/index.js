// Game server: serves the built site (in production) and runs online rooms over Socket.IO.
import express from 'express'
import fs from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { MAX_PLAYERS, Room } from './room.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const songs = JSON.parse(fs.readFileSync(path.join(root, 'src/data/songs.json'), 'utf8'))
const PORT = Number(process.env.PORT) || 3001
const ROOM_IDLE_MS = 10 * 60 * 1000
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const app = express()
const http = createServer(app)
const io = new Server(http, { cors: { origin: true }, pingInterval: 10_000, pingTimeout: 8_000 })

app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: rooms.size }))
const dist = path.join(root, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

/** @type {Map<string, Room>} */
const rooms = new Map()
const titles = [...new Set(songs.map((s) => s.title))]
// aliases help autocomplete but never reveal which song is playing
const titleList = songs.map((s) => ({ title: s.title, aliases: s.aliases || [] }))

function newCode() {
  for (;;) {
    let c = ''
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    if (!rooms.has(c)) return c
  }
}

const cleanName = (n) => String(n ?? '').replace(/[<>]/g, '').trim().slice(0, 16)
const cleanId = (id) => (typeof id === 'string' && /^[\w-]{8,64}$/.test(id) ? id : null)

function attach(socket, room, player) {
  socket.data.code = room.code
  socket.data.playerId = player.id
  socket.join(room.code)
}

function scheduleCleanup(room) {
  clearTimeout(room.cleanupTimer)
  if (!room.empty) return
  room.cleanupTimer = setTimeout(() => {
    if (room.empty) {
      room.clearTimers()
      rooms.delete(room.code)
    }
  }, ROOM_IDLE_MS)
}

io.on('connection', (socket) => {
  const roomOf = () => rooms.get(socket.data.code)
  const me = () => socket.data.playerId

  socket.on('time:ping', (_t, ack) => typeof ack === 'function' && ack(Date.now()))

  socket.on('room:create', ({ name, id, color } = {}, ack) => {
    const playerId = cleanId(id)
    const nm = cleanName(name)
    if (!playerId || !nm) return ack?.({ error: 'חסר שם' })
    const code = newCode()
    const room = new Room(code, songs, (ev, payload) => io.to(code).emit(ev, payload))
    rooms.set(code, room)
    const { player } = room.join({ id: playerId, name: nm, color })
    attach(socket, room, player)
    ack?.({ ok: true, code, playerId, titles: titleList })
    room.broadcast()
  })

  socket.on('room:join', ({ code, name, id, color } = {}, ack) => {
    const room = rooms.get(String(code ?? '').toUpperCase().trim())
    const playerId = cleanId(id)
    const nm = cleanName(name)
    if (!room) return ack?.({ error: 'לא מצאנו חדר עם הקוד הזה' })
    if (!playerId || !nm) return ack?.({ error: 'חסר שם' })
    const res = room.join({ id: playerId, name: nm, color })
    if (res.error) return ack?.({ error: res.error })
    clearTimeout(room.cleanupTimer)
    attach(socket, room, res.player)
    ack?.({ ok: true, code: room.code, playerId, titles: titleList })
    room.broadcast()
  })

  socket.on('room:leave', () => {
    const room = roomOf()
    if (!room) return
    room.leave(me())
    socket.leave(room.code)
    socket.data.code = null
    scheduleCleanup(room)
  })

  socket.on('player:update', (patch = {}) => roomOf()?.update(me(), { name: cleanName(patch.name) || undefined, color: patch.color }))
  socket.on('room:settings', (s = {}) => roomOf()?.setSettings(me(), s))
  socket.on('room:start', (_x, ack) => {
    const r = roomOf()?.start(me())
    if (typeof ack === 'function') ack(r || { error: 'אין חדר' })
  })
  socket.on('room:lobby', () => roomOf()?.backToLobby(me()))
  socket.on('game:buzz', () => roomOf()?.buzz(me()))
  socket.on('game:answer', (alts) => roomOf()?.answer(me(), alts))
  socket.on('game:hint', (key) => roomOf()?.hint(me(), key))
  socket.on('game:more', () => roomOf()?.more(me()))
  socket.on('game:skip', () => roomOf()?.skip(me()))
  socket.on('game:next', () => roomOf()?.next(me()))

  socket.on('disconnect', () => {
    const room = roomOf()
    if (!room) return
    // ignore if the same player already reconnected on another socket
    const stillHere = [...(io.sockets.adapter.rooms.get(room.code) || [])].some((sid) => io.sockets.sockets.get(sid)?.data.playerId === me())
    if (!stillHere) room.disconnect(me())
    scheduleCleanup(room)
  })
})

http.listen(PORT, () => {
  console.log(`🎤 נחש את השיר - שרת פועל על פורט ${PORT} (${songs.length} שירים, עד ${MAX_PLAYERS} שחקנים לחדר, ${titles.length} שמות)`)
})
