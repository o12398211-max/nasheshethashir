import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import Host from '../components/Host'
import StudioBackground from '../components/StudioBackground'
import { hostLine, speakHost } from '../lib/host'
import { sfx } from '../lib/sfx'

export default function EndScreen({ players, onRematch, onHome }) {
  const ranked = [...players].sort((a, b) => b.score - a.score || b.correct - a.correct)
  const tie = ranked.length > 1 && ranked[0].score === ranked[1].score
  const winner = ranked[0]
  const line = tie ? 'תיקו!!! אין מנצח, אבל יש הרבה כבוד. ובעיקר תירוצים. משחק חוזר?' : hostLine('winner', { p: winner.name })

  useEffect(() => {
    sfx.drumroll(1.1)
    const t1 = setTimeout(() => {
      sfx.fanfare()
      speakHost(line)
      const colors = tie ? ['#ffffff', '#ffc53d', '#00e5ff'] : [winner.color, '#ffc53d', '#ffffff']
      const end = Date.now() + 3800
      ;(function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors })
        confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors })
        if (Date.now() < end) requestAnimationFrame(frame)
      })()
      confetti({ particleCount: 160, spread: 110, startVelocity: 45, origin: { y: 0.45 }, colors })
    }, 1150)
    return () => clearTimeout(t1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const avg = (p) => (p.buzzTimes.length ? (p.buzzTimes.reduce((a, b) => a + b, 0) / p.buzzTimes.length).toFixed(1) : '-')

  return (
    <>
      <StudioBackground cheer flash />
      <div className="relative z-10 mx-auto flex min-h-full max-w-3xl flex-col items-center px-4 pb-32 pt-8 text-center sm:pt-14">
        <div className="text-sm tracking-[0.3em] text-neon-cyan">{tie ? 'סוף המשחק' : 'והמנצח הוא...'}</div>
        <div className="pop-in mt-3 text-7xl" style={{ animationDelay: '1.1s' }}>
          {tie ? '🤝' : '🏆'}
        </div>
        <h1 className="neon pop-in mt-2 font-display text-5xl sm:text-7xl" style={{ '--glow': tie ? '#ffc53d' : winner.color, animationDelay: '1.15s' }}>
          {tie ? 'תיקו!' : winner.name}
        </h1>

        <div className="mt-6 self-stretch sm:self-center">
          <Host line={line} />
        </div>

        <div className="glass slide-up mt-6 w-full overflow-hidden rounded-3xl" style={{ animationDelay: '1.4s' }}>
          <table className="w-full text-center">
            <thead className="bg-white/5 text-xs text-white/60 sm:text-sm">
              <tr>
                <th className="py-2.5">#</th>
                <th className="py-2.5 text-start">שחקן</th>
                <th className="py-2.5">נקודות</th>
                <th className="py-2.5">נכונות</th>
                <th className="py-2.5">רצף שיא</th>
                <th className="py-2.5">זמן זמזום ממוצע</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-3 text-xl">{['🥇', '🥈', '🥉'][i] || i + 1}</td>
                  <td className="py-3 text-start font-bold" style={{ color: p.color }}>
                    {p.name}
                  </td>
                  <td className="py-3 font-led text-2xl font-black" style={{ color: p.color, textShadow: `0 0 10px ${p.color}` }}>
                    {p.score}
                  </td>
                  <td className="py-3">{p.correct}</td>
                  <td className="py-3">{p.bestStreak}</td>
                  <td className="py-3 font-led text-sm">{avg(p)}{avg(p) !== '-' && 'ש\''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onRematch} className="flex-1 rounded-2xl bg-gradient-to-l from-neon-pink to-[#b06bff] py-3.5 font-display text-xl shadow-[0_0_24px_#ff2d95] transition hover:brightness-110">
            🔄 משחק חוזר
          </button>
          <button type="button" onClick={onHome} className="glass flex-1 rounded-2xl py-3.5 font-display text-xl transition hover:bg-white/10">
            🏠 לתפריט הראשי
          </button>
        </div>
      </div>
    </>
  )
}
