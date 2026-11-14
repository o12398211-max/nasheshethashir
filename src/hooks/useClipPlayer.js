import { useCallback, useEffect, useRef, useState } from 'react'
import { getCtx } from '../lib/audioContext'

const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

async function refreshItunesUrl(trackId) {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${trackId}&country=il`)
  const j = await r.json()
  return j.results?.[0]?.previewUrl || null
}

/**
 * Plays short clips from a song's audio source, routed through an AnalyserNode
 * so the studio screen can show a live equalizer. Currently supports iTunes previews.
 */
export function useClipPlayer() {
  const audioRef = useRef(null)
  const gainRef = useRef(null)
  const analyserRef = useRef(null)
  const stopTimer = useRef(null)
  const playToken = useRef(0)
  const [playing, setPlaying] = useState(false)

  const ensure = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const a = new Audio()
    a.crossOrigin = 'anonymous'
    a.preload = 'auto'
    a.playsInline = true
    const c = getCtx()
    const src = c.createMediaElementSource(a)
    const gain = c.createGain()
    const analyser = c.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.78
    src.connect(gain).connect(analyser).connect(c.destination)
    audioRef.current = a
    gainRef.current = gain
    analyserRef.current = analyser
    a.addEventListener('pause', () => setPlaying(false))
    a.addEventListener('playing', () => setPlaying(true))
    return a
  }, [])

  /** Call inside a user gesture once, so mobile browsers allow later playback. */
  const unlock = useCallback(() => {
    const a = ensure()
    a.src = SILENT
    a.play().catch(() => {})
  }, [ensure])

  const urlFor = (song) => song.audioSource?.previewUrl

  const preload = useCallback(
    (song) => {
      if (!song) return
      const l = new Audio()
      l.preload = 'auto'
      l.crossOrigin = 'anonymous'
      l.src = urlFor(song)
    },
    [],
  )

  const stop = useCallback((fadeMs = 120) => {
    clearTimeout(stopTimer.current)
    playToken.current++
    const a = audioRef.current
    const g = gainRef.current
    if (!a || !g) return
    const c = getCtx()
    g.gain.cancelScheduledValues(c.currentTime)
    g.gain.setValueAtTime(g.gain.value, c.currentTime)
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime + fadeMs / 1000)
    setTimeout(() => a.pause(), fadeMs + 10)
  }, [])

  /** Play `duration` seconds starting at `from`. Resolves when the clip starts. */
  const play = useCallback(
    async (song, from, duration) => {
      const a = ensure()
      clearTimeout(stopTimer.current)
      const token = ++playToken.current
      const c = getCtx()
      if (c.state === 'suspended') await c.resume()
      const url = urlFor(song)
      const load = (u) =>
        new Promise((res, rej) => {
          if (a.src === u && a.readyState >= 1) return res()
          const ok = () => (cleanup(), res())
          const bad = () => (cleanup(), rej(new Error('load')))
          const cleanup = () => {
            a.removeEventListener('loadedmetadata', ok)
            a.removeEventListener('error', bad)
          }
          a.addEventListener('loadedmetadata', ok)
          a.addEventListener('error', bad)
          a.src = u
          a.load()
        })
      try {
        await load(url)
      } catch {
        // preview URLs can expire: ask iTunes for a fresh one and retry once
        const fresh = song.audioSource?.trackId && (await refreshItunesUrl(song.audioSource.trackId).catch(() => null))
        if (!fresh) throw new Error('audio-unavailable')
        song.audioSource.previewUrl = fresh
        await load(fresh)
      }
      if (token !== playToken.current) return
      a.currentTime = Math.max(0, Math.min(from, (a.duration || 30) - 1))
      const g = gainRef.current
      g.gain.cancelScheduledValues(c.currentTime)
      g.gain.setValueAtTime(0.0001, c.currentTime)
      g.gain.linearRampToValueAtTime(1, c.currentTime + 0.08)
      await a.play()
      if (token !== playToken.current) return
      stopTimer.current = setTimeout(() => stop(350), duration * 1000)
    },
    [ensure, stop],
  )

  useEffect(() => () => stop(0), [stop])

  return { play, stop, preload, unlock, playing, analyserRef }
}
