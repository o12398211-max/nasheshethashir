import { useEffect, useRef, useState } from 'react'

/** Contestant podium with LED score. */
export default function PlayerPod({ player, highlight, locked, gain }) {
  const [bump, setBump] = useState(false)
  const prev = useRef(player.score)
  useEffect(() => {
    if (player.score !== prev.current) {
      prev.current = player.score
      setBump(true)
      const t = setTimeout(() => setBump(false), 650)
      return () => clearTimeout(t)
    }
  }, [player.score])
  return (
    <div
      className={`relative rounded-2xl px-3 py-2 text-center transition-all duration-300 sm:px-5 sm:py-3 ${highlight ? 'scale-105' : ''} ${locked ? 'opacity-45' : ''}`}
      style={{
        background: `linear-gradient(180deg, ${player.color}33, rgba(10,4,30,0.85))`,
        border: `2px solid ${player.color}`,
        boxShadow: highlight ? `0 0 28px ${player.color}, inset 0 0 18px ${player.color}66` : `0 0 10px ${player.color}66`,
      }}
    >
      <div className="max-w-[9rem] truncate text-sm font-bold sm:text-base">{player.name}</div>
      <div className={`font-led text-3xl font-black sm:text-4xl ${bump ? 'score-bump' : ''}`} style={{ color: player.color, textShadow: `0 0 14px ${player.color}` }}>
        {player.score}
      </div>
      {player.streak >= 2 && <div className="text-[11px] font-bold text-neon-gold">🔥 רצף {player.streak}</div>}
      {locked && <div className="text-[11px] text-white/70">🔒 נעול</div>}
      {gain && (
        <div key={gain.key} className="float-points pointer-events-none absolute inset-x-0 -top-4 font-led text-2xl font-black text-neon-gold" style={{ textShadow: '0 0 12px #ffc53d' }}>
          <bdi dir="ltr">+{gain.value}</bdi>
        </div>
      )}
    </div>
  )
}
