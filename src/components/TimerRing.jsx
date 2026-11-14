export default function TimerRing({ remaining, total, size = 96, label }) {
  const r = 42
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, remaining / total))
  const danger = remaining <= 5
  const color = danger ? '#ff3b3b' : frac < 0.5 ? '#ffc53d' : '#00e5ff'
  return (
    <div className={`relative grid place-items-center ${danger && remaining > 0 ? 'animate-pulse' : ''}`} style={{ width: size, height: size }} role="timer" aria-label={`${Math.ceil(remaining)} שניות`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }} />
      </svg>
      <div className="relative text-center leading-none">
        <div className="font-led text-3xl font-black" style={{ color, textShadow: `0 0 12px ${color}` }}>
          {Math.ceil(remaining)}
        </div>
        {label && <div className="mt-1 text-[10px] text-white/60">{label}</div>}
      </div>
    </div>
  )
}
