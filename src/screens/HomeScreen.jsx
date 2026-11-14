import { useEffect, useState } from 'react'
import Host from '../components/Host'
import { hostLine } from '../lib/host'

const MODES = [
  { id: 'duel', icon: '⚔️', title: 'קרב 1 על 1', desc: 'שני שחקנים, שני זמזמים. הראשון ל-10 נקודות מנצח.', ready: true, color: '#ff2d95' },
  { id: 'teams', icon: '👥', title: 'קבוצה נגד קבוצה', desc: 'שתי קבוצות של עד 5 שחקנים. המנצחת נשארת בזירה.', ready: false, color: '#00e5ff' },
  { id: 'survival', icon: '💀', title: 'הישרדות', desc: '3 עד 8 שחקנים. מי שטועה - בחוץ. האחרון שנשאר מנצח.', ready: false, color: '#ffc53d' },
]

export default function HomeScreen({ onPick, songCount }) {
  const [line, setLine] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setLine(hostLine('welcome', { a: 'השחקנים', b: 'השחקניות' })), 500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col items-center px-4 pb-32 pt-10 sm:pt-16">
      <div className="text-center">
        <div className="mb-2 text-sm tracking-[0.3em] text-neon-cyan/80">שעשועון המוזיקה הישראלית</div>
        <h1 className="neon neon-flicker text-6xl leading-none sm:text-8xl" style={{ '--glow': '#ff2d95' }}>
          נחש את השיר
        </h1>
        <div className="mx-auto mt-4 h-1 w-48 rounded-full bg-gradient-to-l from-neon-pink via-neon-cyan to-neon-gold shadow-[0_0_18px_#00e5ff]" />
        <p className="mt-4 text-white/70">{songCount} שירים במאגר · זמזמים · רמזים · מנחה שלא סותם את הפה</p>
      </div>

      <div className="mt-8 self-stretch sm:self-center">
        <Host line={line} />
      </div>

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!m.ready}
            onClick={() => onPick(m.id)}
            className="glass group relative overflow-hidden rounded-3xl p-5 text-start transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{ boxShadow: `0 0 0 1px ${m.color}55, 0 10px 30px rgba(0,0,0,0.4)` }}
          >
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: m.color }} />
            <div className="text-4xl">{m.icon}</div>
            <div className="mt-2 font-display text-2xl" style={{ color: m.color, textShadow: `0 0 10px ${m.color}` }}>
              {m.title}
            </div>
            <div className="mt-1 text-sm text-white/70">{m.desc}</div>
            <div className="mt-4 text-sm font-bold">{m.ready ? <span className="text-white">לשחק ←</span> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">בקרוב</span>}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
