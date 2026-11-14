import { useEffect, useRef, useState } from 'react'
import AnswerPanel from '../components/AnswerPanel'
import Buzzer from '../components/Buzzer'
import Host from '../components/Host'
import PlayerPod from '../components/PlayerPod'
import RevealCard from '../components/RevealCard'
import StudioBackground from '../components/StudioBackground'
import TimerRing from '../components/TimerRing'
import Visualizer from '../components/Visualizer'
import { useNow } from '../hooks/useNow'
import { HINTS, TIMING } from '../lib/game'
import { speakHost, stopHostVoice } from '../lib/host'
import { sfx } from '../lib/sfx'

/** Online round view. All game logic runs on the server; this renders state and plays audio in sync. */
export default function OnlineGameScreen({ room, clip, prefs }) {
  const st = room.state
  const me = room.me
  const isHost = st.hostId === me
  const hostName = st.players.find((p) => p.id === st.hostId)?.name ?? 'מנהל החדר'
  const now = useNow(true, 100)
  const [cheer, setCheer] = useState(false)
  const [gain, setGain] = useState(null)
  const [shake, setShake] = useState(0)
  const [pressedId, setPressedId] = useState(null)
  const [toast, setToast] = useState(null)
  const lastTick = useRef(null)

  // ---- audio: play each clip command at the shared server time ----
  const clipSeq = st.clip?.seq
  useEffect(() => {
    const c = st.clip
    if (!c) return
    if (c.stop) {
      clip.stop(60)
      return
    }
    const song = { audioSource: { type: 'itunes', previewUrl: c.url, trackId: c.trackId } }
    const startLocal = room.toLocal(c.startAt)
    const run = () => {
      const late = Math.max(0, (Date.now() - startLocal) / 1000)
      if (late < c.duration - 0.5) clip.play(song, c.from + late, c.duration - late).catch(() => setToast({ text: '⚠️ השיר לא נטען במכשיר הזה', color: '#ffc53d' }))
    }
    const wait = startLocal - Date.now()
    const t = setTimeout(run, Math.max(0, wait - 40))
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipSeq])

  // preload the next round's audio
  useEffect(() => {
    if (st.nextUrl) clip.preload({ audioSource: { previewUrl: st.nextUrl } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.nextUrl])

  // ---- sound effects pushed by the server ----
  useEffect(
    () =>
      room.onFx((fx) => {
        const who = st.players.find((p) => p.id === fx.playerId)
        if (fx.type === 'buzz') {
          sfx.buzzer()
          setPressedId(fx.playerId)
          setTimeout(() => setPressedId(null), 450)
        } else if (fx.type === 'correct') {
          sfx.correct()
          setTimeout(() => sfx.applause(2.6, 1.1), 250)
          setCheer(true)
          setTimeout(() => setCheer(false), 3200)
          setGain({ key: Date.now(), value: fx.points, id: fx.playerId })
        } else if (fx.type === 'wrong') {
          sfx.wrong()
          setShake((k) => k + 1)
          if (who && fx.said) setToast({ text: `${who.name} ניחש/ה: "${fx.said}" ✗`, color: who.color })
        } else if (fx.type === 'aww') sfx.aww()
        else if (fx.type === 'hint') sfx.hint()
        else if (fx.type === 'whoosh') sfx.whoosh()
        else if (fx.type === 'applause') sfx.applause(2.2, 0.8)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [st.players],
  )
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // ---- host voice: speak lines, but never while I'm answering (the mic could hear it) ----
  useEffect(() => {
    if (!prefs.hostVoice || !st.line) return
    if (st.phase === 'answering' && st.answering?.id === me) return stopHostVoice()
    if (st.phase === 'listening' || st.phase === 'countdown') return
    speakHost(st.line)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.line])

  // ---- buzzing: tap, Space or Enter ----
  const canBuzz = st.phase === 'listening' && now >= room.toLocal(st.clipStartAt) && !st.locked.includes(me)
  const buzz = () => canBuzz && room.emit('game:buzz')
  useEffect(() => {
    const h = (e) => {
      if (e.repeat || ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (st.phase === 'reveal' && isHost) room.emit('game:next')
        else buzz()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // ---- clocks ----
  const listenLeft = st.phase === 'listening' ? Math.max(0, (room.toLocal(st.listenDeadline) - now) / 1000) : TIMING.listenWindow
  const answerLeft = st.answering ? Math.max(0, (room.toLocal(st.answering.deadline) - now) / 1000) : 0
  const countLeft = st.phase === 'countdown' ? (room.toLocal(st.clipStartAt) - now) / 1000 : null
  const countNum = countLeft != null && countLeft <= 3 && countLeft > 0 ? Math.ceil(countLeft) : null
  useEffect(() => {
    const left = st.phase === 'answering' ? answerLeft : st.phase === 'listening' ? listenLeft : null
    const k = countNum ? `c${countNum}` : left != null && left <= 5 && left > 0 ? `t${Math.ceil(left)}` : null
    if (k && k !== lastTick.current) {
      lastTick.current = k
      if (countNum) sfx.countdown(false)
      else sfx.tick()
    }
  })

  const answering = st.answering && st.players.find((p) => p.id === st.answering.id)
  const meP = st.players.find((p) => p.id === me)
  const usedHints = st.hints.map((h) => h.key)

  const myBuzzerState =
    st.phase === 'reveal' && st.outcome?.playerId === me ? 'winner' : st.locked.includes(me) ? 'locked' : st.answering?.id === me || pressedId === me ? 'pressed' : canBuzz ? 'armed' : 'idle'

  const status =
    st.phase === 'intro'
      ? 'מתחממים...'
      : st.phase === 'countdown'
        ? st.isFinal
          ? 'סיבוב אחרון - ניקוד כפול!'
          : 'היכונו...'
        : st.phase === 'listening'
          ? clip.playing
            ? 'מקשיבים...'
            : st.locked.includes(me)
              ? 'טעית בסיבוב הזה - מחכים לאחרים'
              : 'מי מזהה? לחצו על הזמזם!'
          : st.phase === 'answering'
            ? `${answering?.name ?? ''} עונה...`
            : ''

  return (
    <>
      <StudioBackground cheer={cheer} flash={st.phase === 'listening' && clip.playing} alarm={st.phase === 'answering' && answerLeft <= 4} />
      <div className="relative z-10 mx-auto flex min-h-full max-w-6xl flex-col px-3 pb-[15vh] pt-3 sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <div className="glass rounded-full px-3 py-1 text-sm sm:px-4">
            סיבוב <span className="font-led text-neon-cyan">{st.round || '-'}</span>
            <span className="text-white/40">/{st.settings.maxRounds}</span>
            <span className="mx-2 text-white/30">|</span>
            יעד <span className="font-led text-neon-gold">{st.settings.target}</span>
          </div>
          <div className="glass hidden rounded-full px-3 py-1 font-led text-sm tracking-widest text-neon-cyan sm:block" dir="ltr">
            {st.code}
          </div>
          <div className="flex items-center gap-2">
            {!room.connected && <span className="animate-pulse text-xs text-red-300">מתחבר מחדש...</span>}
            <button
              type="button"
              onClick={() => {
                if (confirm('לצאת מהחדר?')) {
                  clip.stop(0)
                  stopHostVoice()
                  room.leave()
                }
              }}
              className="glass rounded-full px-3 py-1 text-sm hover:bg-white/10"
            >
              יציאה ✕
            </button>
          </div>
        </header>

        <div className="mt-3">
          <Host line={st.line} mood={st.mood} compact />
        </div>

        {/* scoreboard */}
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:gap-3">
          {[...st.players]
            .sort((a, b) => b.score - a.score)
            .map((p) => (
              <div key={p.id} className={`relative ${p.connected ? '' : 'opacity-40'}`}>
                <PlayerPod player={p} highlight={st.answering?.id === p.id || pressedId === p.id} locked={st.locked.includes(p.id)} gain={gain?.id === p.id ? gain : null} />
                {p.id === me && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 text-[10px] font-bold text-black">את/ה</div>}
              </div>
            ))}
        </div>

        {/* big screen */}
        <section className="mx-auto mt-4 w-full max-w-2xl" aria-live="polite">
          <div key={shake ? `w${shake}` : 'screen'} className="neon-box relative overflow-hidden rounded-3xl bg-black/55 p-4 sm:p-6" style={{ '--glow': st.isFinal ? '#ffc53d' : '#00e5ff' }}>
            {st.isFinal && <div className="absolute inset-x-0 top-0 bg-neon-gold/90 py-0.5 text-center text-xs font-black tracking-widest text-black">★ סיבוב אחרון · ניקוד כפול ★</div>}
            <div className={`flex items-center gap-4 ${shake ? 'shake' : ''}`}>
              <div className="h-20 flex-1 sm:h-32">
                <Visualizer analyserRef={clip.analyserRef} active={clip.playing} color={meP?.color || '#ff2d95'} />
              </div>
              <TimerRing remaining={st.phase === 'answering' ? answerLeft : listenLeft} total={st.phase === 'answering' ? TIMING.answerWindow : TIMING.listenWindow} label={st.phase === 'answering' ? 'לתשובה' : 'לזמזם'} size={86} />
            </div>
            <div className="mt-3 text-center font-display text-xl sm:text-2xl">{status}</div>

            {(st.phase === 'listening' || st.phase === 'answering') && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="רמזים">
                  {HINTS.map((h) => {
                    const used = st.hints.find((x) => x.key === h.key)
                    return (
                      <button
                        key={h.key}
                        type="button"
                        disabled={!!used}
                        onClick={() => room.emit('game:hint', h.key)}
                        className={`rounded-full px-3 py-1.5 text-sm transition ${used ? 'pop-in neon-box bg-black/50 font-bold' : 'border border-white/20 bg-white/5 hover:bg-white/15'}`}
                        style={used ? { '--glow': '#ffc53d' } : undefined}
                        title={used ? `נחשף ע"י ${used.by}` : 'רמז מוריד נקודה אחת'}
                      >
                        {h.icon} {used ? <span className="text-neon-gold">{used.value}</span> : <>{h.label} <span className="text-xs text-white/50">(-1)</span></>}
                      </button>
                    )
                  })}
                </div>
                {isHost && (
                  <div className="flex justify-center gap-2">
                    <button type="button" onClick={() => room.emit('game:more')} disabled={st.phase !== 'listening' || clip.playing} className="rounded-full border border-neon-cyan/60 bg-neon-cyan/10 px-4 py-1.5 text-sm transition hover:bg-neon-cyan/25 disabled:opacity-35">
                      🔁 שמעו עוד 5 שניות
                    </button>
                    <button type="button" onClick={() => room.emit('game:skip')} className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm transition hover:bg-white/15">
                      ⏭️ דלגו וחשפו
                    </button>
                  </div>
                )}
              </div>
            )}

            {countNum && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <div key={countNum} className="countdown-num neon font-led text-8xl" style={{ '--glow': '#ffc53d' }}>
                  {countNum}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* my buzzer */}
        {meP && (
          <div className="sticky bottom-3 z-20 mt-5 flex flex-col items-center gap-1">
            <Buzzer color={meP.color} name={meP.name} state={myBuzzerState} onPress={buzz} />
            <div className="hidden text-xs text-white/40 sm:block">או מקש רווח</div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pop-in fixed inset-x-0 top-16 z-40 mx-auto w-fit max-w-[90vw] rounded-full border bg-black/80 px-4 py-2 text-sm font-bold" style={{ borderColor: toast.color, color: toast.color }}>
          {toast.text}
        </div>
      )}

      {st.phase === 'answering' && st.answering?.id === me && meP && (
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/45 px-3 pt-24 backdrop-blur-[2px] sm:items-center sm:pt-0">
          <AnswerPanel key={`${st.round}-${st.answering.deadline}`} player={meP} steal={st.answering.steal} remaining={answerLeft} total={TIMING.answerWindow} songs={room.titles} onSubmit={(alts) => room.emit('game:answer', alts)} micEnabled={prefs.mic} />
        </div>
      )}

      {st.phase === 'reveal' && st.outcome && st.song && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-3 backdrop-blur-[2px]">
          <RevealCard song={st.song} outcome={st.outcome} onNext={() => room.emit('game:next')} isLast={st.gameOver} playing={clip.playing} waitingFor={isHost ? null : hostName} />
        </div>
      )}
      {usedHints.length > 0 && <span className="sr-only">רמזים בשימוש: {usedHints.length}</span>}
    </>
  )
}
