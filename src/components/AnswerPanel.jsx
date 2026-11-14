import { useEffect, useRef, useState } from 'react'
import { suggest } from '../lib/hebrew'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import TimerRing from './TimerRing'

/** Answer entry for the player who buzzed: typing with autocomplete, or speaking into the mic. */
export default function AnswerPanel({ player, remaining, total, songs, onSubmit, micEnabled, steal }) {
  const [text, setText] = useState('')
  const [hi, setHi] = useState(0)
  const [nav, setNav] = useState(false)
  const inputRef = useRef(null)
  const speech = useSpeechRecognition({ onFinal: (alts) => onSubmit(alts) })
  const sugg = suggest(text, songs)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30)
    return () => clearTimeout(t)
  }, [player.id])
  useEffect(() => {
    setHi(0)
    setNav(false)
  }, [text])

  const submit = (val) => {
    const v = (val ?? text).trim()
    if (!v) return
    speech.stop()
    onSubmit([v])
  }

  return (
    <div className="glass slide-up w-full max-w-lg rounded-3xl p-4 shadow-2xl sm:p-5" style={{ boxShadow: `0 0 40px ${player.color}88`, borderColor: player.color }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-white/60">{steal ? 'הזכות עברה אל' : 'עונה עכשיו'}</div>
          <div className="font-display text-2xl" style={{ color: player.color, textShadow: `0 0 12px ${player.color}` }}>
            {player.name}
          </div>
        </div>
        <TimerRing remaining={remaining} total={total} size={70} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(nav && sugg[hi] ? sugg[hi] : undefined)
        }}
        className="relative"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={speech.listening ? speech.interim : text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (!sugg.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setNav(true)
                setHi((h) => (nav ? (h + 1) % sugg.length : 0))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setNav(true)
                setHi((h) => (h - 1 + sugg.length) % sugg.length)
              } else if (e.key === 'Tab') {
                e.preventDefault()
                setText(sugg[hi])
              }
            }}
            placeholder={speech.listening ? 'מקשיב...' : 'מה שם השיר?'}
            className="min-w-0 flex-1 rounded-xl border-2 border-white/20 bg-black/50 px-4 py-3 text-lg outline-none transition focus:border-neon-cyan"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="שם השיר"
          />
          {micEnabled && speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              className={`grid w-14 shrink-0 place-items-center rounded-xl border-2 text-2xl transition ${speech.listening ? 'animate-pulse border-red-400 bg-red-500/30' : 'border-white/20 bg-white/10 hover:bg-white/20'}`}
              aria-label={speech.listening ? 'עצור הקלטה' : 'ענה בקול'}
              title="אמרו את שם השיר"
            >
              🎤
            </button>
          )}
          <button type="submit" className="shrink-0 rounded-xl bg-neon-pink px-4 font-bold shadow-[0_0_18px_#ff2d95] transition hover:brightness-110 active:scale-95">
            שלח
          </button>
        </div>
        {!speech.listening && sugg.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/15 bg-[#140a2e]/95 shadow-xl" role="listbox">
            {sugg.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={nav && i === hi}
                  onClick={() => submit(s)}
                  className={`block w-full px-4 py-2 text-start ${nav && i === hi ? 'bg-white/15' : 'hover:bg-white/10'}`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      {speech.error && <div className="mt-2 text-sm text-red-300">{speech.error}</div>}
      {micEnabled && speech.supported && !speech.error && <div className="mt-2 text-xs text-white/50">אפשר להקליד או ללחוץ על 🎤 ולהגיד את שם השיר</div>}
    </div>
  )
}
