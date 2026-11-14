import { useEffect, useState } from 'react'
import { KEY_LABEL, PLAYER_COLORS, saveStorage, storage } from '../lib/game'
import { hostVoiceAvailable } from '../lib/host'
import { speechSupported } from '../hooks/useSpeechRecognition'

const DEFAULTS = {
  players: [
    { id: 'p1', name: 'שחקן 1', color: '#ff2d95', key: 'KeyL' },
    { id: 'p2', name: 'שחקן 2', color: '#00e5ff', key: 'KeyA' },
  ],
  target: 10,
  maxRounds: 15,
  hostVoice: true,
  mic: true,
  sfx: true,
}

function Choice({ value, options, onChange, label }) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-white/70">{label}</div>
      <div className="flex gap-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={`flex-1 rounded-xl border py-2 font-led font-bold transition ${value === o ? 'border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_12px_#00e5ff]' : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ on, onChange, label, hint, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-xs text-white/50">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={on && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-neon-pink peer-focus-visible:ring-2 peer-focus-visible:ring-neon-cyan after:absolute after:top-1 after:right-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:-translate-x-5" />
    </label>
  )
}

export default function SetupScreen({ onStart, onBack }) {
  const [cfg, setCfg] = useState(() => {
    const s = storage('nhs-duel-setup', null)
    return s ? { ...DEFAULTS, ...s } : DEFAULTS
  })
  const [capturing, setCapturing] = useState(null)
  const [voiceOk, setVoiceOk] = useState(hostVoiceAvailable())

  useEffect(() => {
    const t = setTimeout(() => setVoiceOk(hostVoiceAvailable()), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (capturing == null) return
    const h = (e) => {
      e.preventDefault()
      if (e.code === 'Escape') return setCapturing(null)
      setCfg((c) => ({ ...c, players: c.players.map((p, i) => (i === capturing ? { ...p, key: e.code } : p)) }))
      setCapturing(null)
    }
    window.addEventListener('keydown', h, { once: true })
    return () => window.removeEventListener('keydown', h)
  }, [capturing])

  const setPlayer = (i, patch) => setCfg((c) => ({ ...c, players: c.players.map((p, j) => (j === i ? { ...p, ...patch } : p)) }))
  const sameKey = cfg.players[0].key === cfg.players[1].key
  const sameColor = cfg.players[0].color === cfg.players[1].color
  const valid = !sameKey && !sameColor && cfg.players.every((p) => p.name.trim())

  const start = () => {
    saveStorage('nhs-duel-setup', cfg)
    onStart({ ...cfg, players: cfg.players.map((p) => ({ ...p, name: p.name.trim() })) })
  }

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-32 pt-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10">
          → חזרה
        </button>
        <h2 className="neon font-display text-3xl sm:text-4xl" style={{ '--glow': '#ff2d95' }}>
          ⚔️ קרב 1 על 1
        </h2>
        <span className="w-20" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cfg.players.map((p, i) => (
          <div key={p.id} className="glass rounded-3xl p-4" style={{ boxShadow: `0 0 24px ${p.color}55`, borderColor: `${p.color}88` }}>
            <div className="mb-2 text-xs text-white/60">{i === 0 ? 'צד ימין' : 'צד שמאל'}</div>
            <input
              value={p.name}
              maxLength={16}
              onChange={(e) => setPlayer(i, { name: e.target.value })}
              className="w-full rounded-xl border-2 bg-black/40 px-3 py-2.5 font-display text-2xl outline-none"
              style={{ borderColor: p.color, color: p.color }}
              aria-label={`שם שחקן ${i + 1}`}
            />
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="צבע">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={p.color === c.hex}
                  aria-label={c.name}
                  onClick={() => setPlayer(i, { color: c.hex })}
                  className={`h-8 w-8 rounded-full transition ${p.color === c.hex ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-70 hover:opacity-100'}`}
                  style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="text-white/70">מקש זמזם במקלדת:</span>
              <button type="button" onClick={() => setCapturing(i)} className={`min-w-24 rounded-lg border px-3 py-1.5 font-led ${capturing === i ? 'animate-pulse border-neon-gold text-neon-gold' : 'border-white/25 bg-black/40'}`}>
                {capturing === i ? 'לחצו מקש...' : KEY_LABEL(p.key)}
              </button>
            </div>
          </div>
        ))}
      </div>
      {(sameKey || sameColor) && <div className="mt-3 text-center text-sm text-red-300">{sameKey ? 'לשני השחקנים אותו מקש - בחרו מקש אחר' : 'בחרו צבע שונה לכל שחקן'}</div>}

      <div className="glass mt-4 grid gap-4 rounded-3xl p-4 sm:grid-cols-2">
        <Choice label="יעד נקודות לניצחון" value={cfg.target} options={[5, 10, 15]} onChange={(v) => setCfg((c) => ({ ...c, target: v }))} />
        <Choice label="מספר סיבובים מקסימלי" value={cfg.maxRounds} options={[10, 15, 20]} onChange={(v) => setCfg((c) => ({ ...c, maxRounds: v }))} />
        <Toggle label="🎤 תשובה בקול" hint={speechSupported ? 'אומרים את שם השיר למיקרופון' : 'הדפדפן הזה לא תומך - נסו Chrome'} on={cfg.mic} disabled={!speechSupported} onChange={(v) => setCfg((c) => ({ ...c, mic: v }))} />
        <Toggle label="🗣️ המנחה מדבר בקול" hint={voiceOk ? 'הקראת המשפטים בעברית' : 'אין קול עברי במכשיר הזה'} on={cfg.hostVoice} disabled={!voiceOk} onChange={(v) => setCfg((c) => ({ ...c, hostVoice: v }))} />
        <Toggle label="🔊 אפקטים קוליים" on={cfg.sfx} onChange={(v) => setCfg((c) => ({ ...c, sfx: v }))} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-white/70">
        <b className="text-white">איך משחקים:</b> שומעים 5 שניות משיר. מי שמזהה - לוחץ על הזמזם (במסך או במקש שלו) ועונה. מהר יותר = יותר נקודות (3/2/1). טעות? הזכות עוברת ליריב. רמזים עולים נקודה. 3 תשובות ברצף = בונוס. הסיבוב האחרון שווה כפול!
      </div>

      <button type="button" disabled={!valid} onClick={start} className="mt-6 w-full rounded-2xl bg-gradient-to-l from-neon-pink to-[#b06bff] py-4 font-display text-2xl shadow-[0_0_30px_#ff2d95] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40">
        עולים לבמה! 🎬
      </button>
    </div>
  )
}
