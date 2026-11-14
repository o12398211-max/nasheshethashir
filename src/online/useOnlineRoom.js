import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

function playerId() {
  try {
    let id = localStorage.getItem('nhs-player-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('nhs-player-id', id)
    }
    return id
  } catch {
    return (window.__nhsId ||= crypto.randomUUID())
  }
}

/**
 * Connection to an online room. Keeps a clock offset to the server so every
 * device starts the clip at the same moment.
 */
export function useOnlineRoom() {
  const sockRef = useRef(null)
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [titles, setTitles] = useState([])
  const [me, setMe] = useState(null)
  const offsetRef = useRef(0) // serverTime - localTime
  const fxHandlers = useRef(new Set())
  const joinedRef = useRef(null) // {code, name, color} for auto-rejoin

  const syncClock = useCallback(async (sock) => {
    const samples = []
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now()
      const server = await new Promise((res) => sock.timeout(3000).emit('time:ping', t0, (err, s) => res(err ? null : s)))
      const t1 = Date.now()
      if (server) samples.push({ rtt: t1 - t0, off: server - (t0 + t1) / 2 })
    }
    if (samples.length) offsetRef.current = samples.sort((a, b) => a.rtt - b.rtt)[0].off
  }, [])

  const socket = useCallback(() => {
    if (sockRef.current) return sockRef.current
    const s = io({ transports: ['websocket', 'polling'] })
    sockRef.current = s
    s.on('connect', () => {
      setConnected(true)
      syncClock(s)
      const j = joinedRef.current
      if (j) s.emit('room:join', { ...j, id: playerId() }, () => {})
    })
    s.on('disconnect', () => setConnected(false))
    s.on('room:state', (st) => {
      if (import.meta.env.DEV) window.__roomState = st
      setState(st)
    })
    s.on('fx', (fx) => fxHandlers.current.forEach((h) => h(fx)))
    return s
  }, [syncClock])

  useEffect(
    () => () => {
      sockRef.current?.disconnect()
      sockRef.current = null
    },
    [],
  )

  const call = (event, payload) =>
    new Promise((resolve) => {
      const s = socket()
      s.timeout(8000).emit(event, payload, (err, res) => resolve(err ? { error: 'אין חיבור לשרת. נסו שוב.' } : res))
    })

  const enter = async (event, payload) => {
    const res = await call(event, { ...payload, id: playerId() })
    if (res?.ok) {
      joinedRef.current = { code: res.code, name: payload.name, color: payload.color }
      setMe(res.playerId)
      setTitles(res.titles || [])
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('room', res.code)
        window.history.replaceState(null, '', url)
      } catch {
        /* ignore */
      }
    }
    return res
  }

  const leave = () => {
    sockRef.current?.emit('room:leave')
    joinedRef.current = null
    setState(null)
    setMe(null)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('room')
      window.history.replaceState(null, '', url)
    } catch {
      /* ignore */
    }
  }

  const emit = (event, payload) => sockRef.current?.emit(event, payload)

  return {
    state,
    me,
    titles,
    connected,
    serverNow: () => Date.now() + offsetRef.current,
    toLocal: (serverTime) => serverTime - offsetRef.current,
    onFx: (h) => {
      fxHandlers.current.add(h)
      return () => fxHandlers.current.delete(h)
    },
    create: (p) => enter('room:create', p),
    join: (p) => enter('room:join', p),
    start: () => call('room:start'),
    leave,
    emit,
  }
}
