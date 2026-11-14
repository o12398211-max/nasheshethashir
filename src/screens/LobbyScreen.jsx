import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import Host from '../components/Host'
import { PLAYER_COLORS } from '../lib/game'
import { hostVoiceAvailable } from '../lib/host'
import { speechSupported } from '../hooks/useSpeechRecognition'

const MAX = 8

function Choice({ value, options, onChange, label, disabled }) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-white/70">{label}</div>
      <div className="flex gap-2">
        {options.map((o) => (
          <button key={o} type="button" disabled={disabled} onClick={() => onChange(o)} className={`flex-1 rounded-xl border py-2 font-led transition disabled:cursor-default ${value === o ? 'border-neon-cyan bg-neon-cyan/20 text-white shadow-[0_0_12px_#00e5ff]' : 'border-white/15 bg-white/5 text-white/60 enabled:hover:bg-white/10'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function LobbyScreen({ room, prefs, setPrefs }) {
  const st = room.state
  const isHost = st.hostId === room.me
  const meP = st.players.find((p) => p.id === room.me)
  const link = useMemo(() => {
    const u = new URL(window.location.href)
    u.search = `?room=${st.code}`
    u.hash = ''
    return u.toString()
  }, [st.code])
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const [startErr, setStartErr] = useState('')
  const connectedCount = st.players.filter((p) => p.connected).length

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#0b0620', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('העתיקו את הקישור:', link)
    }
  }
  const share = async () => {
    const text = `בואו לשחק איתי "נחש את השיר"! קוד החדר: ${st.code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'נחש את השיר', text, url: link })
        return
      } catch {
        /* cancelled */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`, '_blank', 'noopener')
  }
  const start = async () => {
    setStartErr('')
    const r = await room.start()
    if (r?.error) setStartErr(r.error)
  }

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-32 pt-5 sm:pt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={room.leave} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10">
          → יציאה מהחדר
        </button>
        <div className={`flex items-center gap-2 text-xs ${room.connected ? 'text-lime-300' : 'text-red-300'}`}>
          <span className={`h-2 w-2 rounded-full ${room.connected ? 'bg-lime-400 shadow-[0_0_8px_#7dff4d]' : 'animate-pulse bg-red-400'}`} />
          {room.connected ? 'מחובר' : 'מתחבר מחדש...'}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* invite */}
        <section className="glass rounded-3xl p-5 text-center" aria-label="הזמנת חברים">
          <div className="text-sm text-white/60">קוד החדר</div>
          <div dir="ltr" className="neon my-1 font-led text-6xl tracking-[0.25em] sm:text-7xl" style={{ '--glow': '#00e5ff' }}>
            {st.code}
          </div>
          {qr && <img src={qr} alt={`קוד QR להצטרפות לחדר ${st.code}`} className="mx-auto mt-3 h-40 w-40 rounded-2xl border-4 border-white shadow-[0_0_30px_#00e5ff66]" />}
          <div className="mt-2 text-xs text-white/50">סרקו עם המצלמה, או שלחו קישור:</div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={share} className="flex-1 rounded-xl bg-[#25d366] py-2.5 font-bold text-black shadow-[0_0_16px_#25d36688] transition hover:brightness-110">
              📲 שיתוף
            </button>
            <button type="button" onClick={copy} className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 font-bold transition hover:bg-white/20">
              {copied ? '✓ הועתק!' : '🔗 העתקת קישור'}
            </button>
          </div>
        </section>

        {/* players */}
        <section className="glass rounded-3xl p-5" aria-label="שחקנים">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl">שחקנים בלובי</h2>
            <span className="font-led text-white/60">
              {st.players.length}/{MAX}
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {st.players.map((p) => (
              <li key={p.id} className={`slide-up flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${p.connected ? '' : 'opacity-40'}`} style={{ borderColor: `${p.color}aa`, background: `linear-gradient(90deg, ${p.color}22, transparent)` }}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                <span className="truncate font-bold" style={{ color: p.color }}>
                  {p.name}
                </span>
                {p.id === st.hostId && <span title="מנהל החדר">👑</span>}
                {p.id === room.me && <span className="text-xs text-white/50">(את/ה)</span>}
                {!p.connected && <span className="text-xs">📴</span>}
              </li>
            ))}
            {Array.from({ length: Math.max(0, Math.min(2, MAX - st.players.length)) }).map((_, i) => (
              <li key={`empty${i}`} className="rounded-2xl border border-dashed border-white/15 px-3 py-2.5 text-sm text-white/30">
                ממתינים לחבר/ה...
              </li>
            ))}
          </ul>

          {meP && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <span className="text-sm text-white/60">הצבע שלך:</span>
              {PLAYER_COLORS.map((c) => {
                const taken = st.players.some((p) => p.id !== room.me && p.color === c.hex)
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={taken}
                    aria-label={c.name}
                    aria-pressed={meP.color === c.hex}
                    onClick={() => room.emit('player:update', { color: c.hex })}
                    className={`h-7 w-7 rounded-full transition disabled:opacity-15 ${meP.color === c.hex ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                    style={{ background: c.hex }}
                  />
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="glass mt-5 grid gap-4 rounded-3xl p-5 sm:grid-cols-2" aria-label="הגדרות">
        <Choice label={`יעד נקודות${isHost ? '' : ' (נקבע ע"י מנהל החדר)'}`} value={st.settings.target} options={[5, 10, 15, 20]} disabled={!isHost} onChange={(v) => room.emit('room:settings', { ...st.settings, target: v })} />
        <Choice label="מספר סיבובים מקסימלי" value={st.settings.maxRounds} options={[5, 10, 15, 20]} disabled={!isHost} onChange={(v) => room.emit('room:settings', { ...st.settings, maxRounds: v })} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {[
            ['sfx', '🔊 אפקטים', true],
            ['mic', '🎤 תשובה בקול', speechSupported],
            ['hostVoice', '🗣️ קול המנחה', hostVoiceAvailable()],
          ].map(([k, label, ok]) => (
            <button key={k} type="button" disabled={!ok} onClick={() => setPrefs({ ...prefs, [k]: !prefs[k] })} aria-pressed={!!prefs[k] && ok} className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-35 ${prefs[k] && ok ? 'border-neon-pink bg-neon-pink/20' : 'border-white/15 bg-white/5'}`}>
              {label} {prefs[k] && ok ? 'פועל' : 'כבוי'}
            </button>
          ))}
          <span className="self-center text-xs text-white/40">(הגדרות אישיות למכשיר הזה)</span>
        </div>
      </section>

      <div className="mt-5">
        <Host line={st.line} compact />
      </div>

      {isHost ? (
        <>
          <button type="button" disabled={connectedCount < 2} onClick={start} className="mt-5 w-full rounded-2xl bg-gradient-to-l from-neon-pink to-[#b06bff] py-4 font-display text-2xl shadow-[0_0_30px_#ff2d95] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40">
            {connectedCount < 2 ? 'ממתינים לעוד שחקן לפחות...' : `מתחילים! 🎬 (${connectedCount} שחקנים)`}
          </button>
          {startErr && <div className="mt-2 text-center text-sm text-red-300">{startErr}</div>}
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/15 bg-black/30 py-4 text-center text-lg text-white/70">⏳ ממתינים שמנהל/ת החדר יתחיל/תתחיל את המשחק</div>
      )}
      <p className="mt-3 text-center text-xs text-white/40">כל שחקן משחק מהמכשיר שלו. השיר מתנגן אצל כולם בו זמנית - כדאי להגביר ווליום.</p>
    </div>
  )
}
