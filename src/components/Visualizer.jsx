import { useEffect, useRef } from 'react'

/** Neon equalizer reading a Web Audio AnalyserNode; idles with a gentle wave when silent. */
export default function Visualizer({ analyserRef, active, color = '#ff2d95', className = '' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    let raf
    let data
    const bars = 32
    const levels = new Array(bars).fill(0)
    const draw = (t) => {
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (cv.width !== w * dpr) {
        cv.width = w * dpr
        cv.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const an = analyserRef?.current
      if (an && active) {
        data = data || new Uint8Array(an.frequencyBinCount)
        an.getByteFrequencyData(data)
      }
      const gap = 4
      const bw = (w - gap * (bars - 1)) / bars
      for (let i = 0; i < bars; i++) {
        // mirror from the center outwards
        const k = Math.abs(i - (bars - 1) / 2) / (bars / 2)
        let target
        if (an && active && data) {
          const bin = Math.floor(k * k * data.length * 0.7) + 1
          target = data[bin] / 255
        } else {
          target = 0.06 + 0.05 * Math.sin(t / 600 + i * 0.5)
        }
        levels[i] += (target - levels[i]) * 0.35
        const bh = Math.max(3, levels[i] * h * 0.95)
        const x = i * (bw + gap)
        const g = ctx.createLinearGradient(0, h, 0, h - bh)
        g.addColorStop(0, color)
        g.addColorStop(1, '#ffffff')
        ctx.fillStyle = g
        ctx.shadowColor = color
        ctx.shadowBlur = 12
        const y = (h - bh) / 2
        ctx.beginPath()
        ctx.roundRect(x, y, bw, bh, bw / 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [analyserRef, active, color])
  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-hidden="true" />
}
