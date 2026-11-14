import { memo, useMemo } from 'react'

const BEAMS = [
  { left: '12%', beam: 'rgba(255,45,149,0.45)', from: '-30deg', to: '18deg', dur: '9s' },
  { left: '38%', beam: 'rgba(0,229,255,0.35)', from: '20deg', to: '-22deg', dur: '11s' },
  { left: '62%', beam: 'rgba(255,197,61,0.32)', from: '-18deg', to: '24deg', dur: '10s' },
  { left: '88%', beam: 'rgba(176,107,255,0.45)', from: '28deg', to: '-16deg', dur: '8s' },
]

const Audience = memo(function Audience({ cheer }) {
  const fans = useMemo(() => {
    const out = []
    let x = -10
    let seed = 7
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
    while (x < 1010) {
      const w = 34 + rnd() * 18
      out.push({ x, w, h: 38 + rnd() * 22, d: rnd() * 1.2, glow: rnd() < 0.22, hue: ['#ff2d95', '#00e5ff', '#ffc53d', '#7dff4d'][Math.floor(rnd() * 4)], shade: 8 + Math.floor(rnd() * 10) })
      x += w * 0.72
    }
    return out
  }, [])
  return (
    <svg className={`audience ${cheer ? 'cheer' : ''}`} viewBox="0 0 1000 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="aud-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {fans.map((f, i) => {
        const cx = f.x + f.w / 2
        const top = 100 - f.h
        const fill = `hsl(265 40% ${f.shade}%)`
        return (
          <g key={i} className="fan" style={{ animationDelay: `${-f.d}s` }}>
            {f.glow && (
              <g className="glow" style={{ transformOrigin: `${cx + f.w * 0.35}px ${top + 14}px`, animationDelay: `${-f.d * 2}s` }}>
                <rect x={cx + f.w * 0.33} y={top - 20} width="4" height="24" rx="2" fill={f.hue} style={{ filter: `drop-shadow(0 0 6px ${f.hue})` }} />
              </g>
            )}
            <g className="arms" stroke={fill} strokeWidth="7" strokeLinecap="round">
              <line x1={cx - f.w * 0.3} y1={top + 22} x2={cx - f.w * 0.55} y2={top - 8} />
              <line x1={cx + f.w * 0.3} y1={top + 22} x2={cx + f.w * 0.55} y2={top - 8} />
            </g>
            <circle cx={cx} cy={top + 9} r={f.w * 0.24} fill={fill} />
            <path d={`M${f.x + 2} 100 Q${f.x + 2} ${top + 20} ${cx} ${top + 19} Q${f.x + f.w - 2} ${top + 20} ${f.x + f.w - 2} 100 Z`} fill={fill} />
          </g>
        )
      })}
      <rect x="0" y="0" width="1000" height="100" fill="url(#aud-fade)" />
    </svg>
  )
})

export default function StudioBackground({ cheer = false, flash = false, alarm = false, audience = true }) {
  return (
    <div className={`studio ${flash ? 'flash' : ''} ${alarm ? 'alarm' : ''}`} aria-hidden="true">
      <div className="led-wall" />
      {BEAMS.map((b, i) => (
        <div key={i} className="beam" style={{ left: b.left, '--beam': b.beam, '--from': b.from, '--to': b.to, '--dur': b.dur }} />
      ))}
      <div className="stage-floor" />
      {audience && <Audience cheer={cheer} />}
    </div>
  )
}
