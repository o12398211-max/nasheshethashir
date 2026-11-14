import { useEffect, useState } from 'react'
import Host from '../components/Host'
import { PLAYER_COLORS, saveStorage, storage } from '../lib/game'
import { hostLine } from '../lib/host'

const LOCAL_MODES = [
  { id: 'duel', icon: '⚔️', title: 'קרב 1 על 1', desc: 'שני שחקנים, שני זמזמים, מסך אחד.', ready: true, color: '#ff2d95' },
  { id: 'teams', icon: '👥', title: 'קבוצה נגד קבוצה', desc: 'שתי קבוצות של עד 5 שחקנים.', ready: false, color: '#00e5ff' },
  { id: 'survival', icon: '💀', title: 'הישרדות', desc: '3 עד 8 שחקנים. מי שטועה - בחוץ.', ready: false, color: '#ffc53d' },
]

function initialCode() {
  try {
    return (new URLSearchParams(window.location.search).get('room') || '').toUpperCase().slice(0, 4)
  } catch {
    return ''
  }
}

/** Entry screen: create / join an online lobby, or play locally on one device. */
export default function HomeScreen({ onPickLocal, onCreate, onJoin, songCount }) {
  const [line, setLine] = useState('')
  const [profile, setProfile] = useState(() => storage('nhs-profile', { name: '', color: PLAYER_COLORS[0].hex }))
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const invited = initialCode().length === 4

  useEffect(() => {
    const t = setTimeout(() => setLine(invited ? 'הוזמנתם לחדר! תכתבו שם ותעלו לבמה.' : hostLine('welcome', { a: 'השחקנים', b: 'השחקניות' })), 500)
    return () => clearTimeout(t)
  }, [invited])

  const name = profile.name.trim()
  const run = async (kind) => {
    if (!name) return setError('קודם כותבים שם 🙂')
    if (kind === 'join' && code.length !== 4) return setError('קוד חדר הוא 4 תווים')
    setError('')
    setBusy(kind)
    saveStorage('nhs-profile', profile)
    const res = kind === 'create' ? await onCreate({ name, color: profile.color }) : await onJoin({ code, name, color: profile.color })
    setBusy(null)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col items-center px-4 pb-32 pt-8 sm:pt-12">
      <div className="text-center">
        <div className="mb-2 text-sm tracking-[0.3em] text-neon-cyan/80">שעשועון המוזיקה הישראלית</div>
        <h1 className="neon neon-flicker text-6xl leading-none sm:text-8xl" style={{ '--glow': '#ff2d95' }}>
          נחש את השיר
        </h1>
        <div className="mx-auto mt-4 h-1 w-48 rounded-full bg-gradient-to-l from-neon-pink via-neon-cyan to-neon-gold shadow-[0_0_18px_#00e5ff]" />
        <p className="mt-4 text-white/70">{songCount} שירים במאגר · זמזמים · רמזים · מנחה שלא סותם את הפה</p>
      </div>

      <div className="mt-6 self-stretch sm:self-center">
        <Host line={line} />
      </div>

      {/* online lobby */}
      <section className="glass mt-6 w-full max-w-2xl rounded-3xl p-5 sm:p-6" style={{ boxShadow: '0 0 0 1px #00e5ff66, 0 0 40px #00e5ff33' }} aria-labelledby="online-title">
        <h2 id="online-title" className="neon font-display text-2xl sm:text-3xl" style={{ '--glow': '#00e5ff' }}>
          🌐 שחקו עם חברים אונליין
        </h2>
        <p className="mt-1 text-sm text-white/70">כל אחד מהטלפון שלו. פותחים לובי, שולחים קוד לחברים - ומתחילים.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={profile.name}
            maxLength={16}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="השם שלך"
            aria-label="השם שלך"
            className="rounded-xl border-2 border-white/20 bg-black/40 px-4 py-3 text-lg outline-none focus:border-neon-cyan"
            style={{ color: profile.color }}
          />
          <div className="flex items-center justify-center gap-1.5" role="radiogroup" aria-label="הצבע שלך">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={profile.color === c.hex}
                aria-label={c.name}
                onClick={() => setProfile((p) => ({ ...p, color: c.hex }))}
                className={`h-8 w-8 rounded-full transition ${profile.color === c.hex ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-60 hover:opacity-100'}`}
                style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!invited && (
            <button type="button" disabled={!!busy} onClick={() => run('create')} className="rounded-2xl bg-gradient-to-l from-neon-pink to-[#b06bff] px-4 py-3.5 font-display text-xl shadow-[0_0_24px_#ff2d95] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
              {busy === 'create' ? 'פותחים לובי...' : '✨ צור לובי חדש'}
            </button>
          )}
          <form
            className={`flex gap-2 ${invited ? 'sm:col-span-2' : ''}`}
            onSubmit={(e) => {
              e.preventDefault()
              run('join')
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
              placeholder="קוד חדר"
              aria-label="קוד חדר"
              dir="ltr"
              inputMode="text"
              autoCapitalize="characters"
              className="w-full min-w-0 rounded-2xl border-2 border-neon-cyan/50 bg-black/40 px-3 text-center font-led text-2xl tracking-[0.3em] uppercase outline-none focus:border-neon-cyan"
            />
            <button type="submit" disabled={!!busy} className="shrink-0 rounded-2xl border-2 border-neon-cyan bg-neon-cyan/15 px-5 font-bold shadow-[0_0_14px_#00e5ff88] transition hover:bg-neon-cyan/30 disabled:opacity-50">
              {busy === 'join' ? '...' : 'הצטרפות'}
            </button>
          </form>
        </div>
        {error && (
          <div role="alert" className="mt-3 text-center text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* local */}
      <div className="mt-8 mb-3 flex w-full max-w-2xl items-center gap-3 text-sm text-white/50">
        <div className="h-px flex-1 bg-white/15" />
        או שחקו על מכשיר אחד
        <div className="h-px flex-1 bg-white/15" />
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {LOCAL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={!m.ready}
            onClick={() => onPickLocal(m.id)}
            className="glass group relative overflow-hidden rounded-3xl p-4 text-start transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            style={{ boxShadow: `0 0 0 1px ${m.color}55, 0 10px 30px rgba(0,0,0,0.4)` }}
          >
            <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: m.color }} />
            <div className="flex items-center gap-2">
              <span className="text-3xl">{m.icon}</span>
              <span className="font-display text-xl" style={{ color: m.color, textShadow: `0 0 10px ${m.color}` }}>
                {m.title}
              </span>
            </div>
            <div className="mt-1 text-sm text-white/70">{m.desc}</div>
            <div className="mt-3 text-sm font-bold">{m.ready ? <span className="text-white">לשחק ←</span> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">בקרוב</span>}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
