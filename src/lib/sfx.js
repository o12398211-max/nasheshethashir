// Studio sound effects, synthesized with Web Audio (no audio files needed).
import { getCtx } from './audioContext'

let master = null
let muted = false
function out() {
  const c = getCtx()
  if (!master) {
    master = c.createGain()
    master.gain.value = 0.55
    master.connect(c.destination)
  }
  return master
}
export function setSfxMuted(m) {
  muted = m
}

function tone({ freq, type = 'sine', start = 0, dur = 0.2, vol = 0.3, attack = 0.005, slideTo, filter }) {
  if (muted) return
  const c = getCtx()
  const t = c.currentTime + start
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node = o
  if (filter) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filter
    o.connect(f)
    node = f
  }
  node.connect(g).connect(out())
  o.start(t)
  o.stop(t + dur + 0.05)
}

let noiseBuf = null
function noise() {
  const c = getCtx()
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}
function noiseBurst({ start = 0, dur = 0.05, vol = 0.3, freq = 1500, q = 1.2, type = 'bandpass' }) {
  if (muted) return
  const c = getCtx()
  const t = c.currentTime + start
  const src = c.createBufferSource()
  src.buffer = noise()
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(out())
  src.start(t, Math.random())
  src.stop(t + dur + 0.02)
}

export const sfx = {
  buzzer() {
    tone({ freq: 140, type: 'sawtooth', dur: 0.55, vol: 0.35, filter: 1800 })
    tone({ freq: 147, type: 'square', dur: 0.55, vol: 0.18, filter: 1400 })
    tone({ freq: 70, type: 'sine', dur: 0.5, vol: 0.4 })
  },
  correct() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone({ freq: f, type: 'triangle', start: i * 0.09, dur: 0.6, vol: 0.28 })
      tone({ freq: f * 2, type: 'sine', start: i * 0.09, dur: 0.4, vol: 0.06 })
    })
  },
  wrong() {
    tone({ freq: 220, type: 'square', dur: 0.32, vol: 0.2, filter: 1200, slideTo: 180 })
    tone({ freq: 160, type: 'square', start: 0.33, dur: 0.6, vol: 0.2, filter: 1000, slideTo: 110 })
  },
  tick() {
    tone({ freq: 1800, type: 'square', dur: 0.03, vol: 0.08, filter: 4000 })
  },
  countdown(final = false) {
    tone({ freq: final ? 880 : 440, type: 'triangle', dur: final ? 0.5 : 0.18, vol: 0.3 })
  },
  whoosh() {
    if (muted) return
    const c = getCtx()
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noise()
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 2
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(4000, t + 0.35)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.15)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    src.connect(f).connect(g).connect(out())
    src.start(t)
    src.stop(t + 0.45)
  },
  applause(seconds = 2.8, intensity = 1) {
    const claps = Math.round(55 * seconds * intensity)
    for (let i = 0; i < claps; i++) {
      const s = Math.random() * seconds
      const fade = 1 - Math.max(0, s - seconds * 0.6) / (seconds * 0.4)
      noiseBurst({ start: s, dur: 0.03 + Math.random() * 0.04, vol: (0.08 + Math.random() * 0.12) * fade, freq: 900 + Math.random() * 1800, q: 0.8 })
    }
    noiseBurst({ start: 0, dur: seconds, vol: 0.03, freq: 1200, q: 0.3 })
  },
  aww() {
    tone({ freq: 330, type: 'sawtooth', dur: 1.1, vol: 0.06, filter: 700, slideTo: 200 })
    tone({ freq: 262, type: 'sawtooth', dur: 1.1, vol: 0.06, filter: 600, slideTo: 160 })
  },
  hint() {
    tone({ freq: 1320, type: 'sine', dur: 0.15, vol: 0.15 })
    tone({ freq: 1760, type: 'sine', start: 0.08, dur: 0.25, vol: 0.12 })
  },
  fanfare() {
    const seq = [[392, 0], [523.25, 0.15], [659.25, 0.3], [783.99, 0.45], [659.25, 0.62], [783.99, 0.75], [1046.5, 0.9]]
    seq.forEach(([f, s], i) => {
      const d = i === seq.length - 1 ? 1.2 : 0.18
      tone({ freq: f, type: 'sawtooth', start: s, dur: d, vol: 0.12, filter: 2600 })
      tone({ freq: f, type: 'triangle', start: s, dur: d, vol: 0.18 })
    })
    sfx.applause(4, 1.4)
  },
  drumroll(seconds = 1.2) {
    for (let t = 0; t < seconds; t += 0.035) noiseBurst({ start: t, dur: 0.04, vol: 0.05 + (t / seconds) * 0.12, freq: 220, q: 0.7, type: 'lowpass' })
    noiseBurst({ start: seconds, dur: 0.5, vol: 0.35, freq: 4000, q: 0.5 })
  },
}
