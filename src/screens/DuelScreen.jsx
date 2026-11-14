import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AnswerPanel from '../components/AnswerPanel'
import Buzzer from '../components/Buzzer'
import HintBar from '../components/HintBar'
import Host from '../components/Host'
import PlayerPod from '../components/PlayerPod'
import RevealCard from '../components/RevealCard'
import StudioBackground from '../components/StudioBackground'
import TimerRing from '../components/TimerRing'
import Visualizer from '../components/Visualizer'
import { useBuzzerKeys } from '../hooks/useBuzzerKeys'
import { useClipPlayer } from '../hooks/useClipPlayer'
import { useNow } from '../hooks/useNow'
import { scoreFor, shuffle, TIMING } from '../lib/game'
import { isCorrectAnswer } from '../lib/hebrew'
import { hostLine, speakHost, stopHostVoice } from '../lib/host'
import { sfx } from '../lib/sfx'

/**
 * 1-vs-1 duel. Phases:
 * intro → countdown → listening → answering (→ steal) → reveal → … → end
 */
export default function DuelScreen({ config, songs, onEnd, onExit }) {
  const { target, maxRounds, mic } = config
  const clip = useClipPlayer()
  const deck = useRef(shuffle(songs))
  const [players, setPlayers] = useState(() => config.players.map((p) => ({ ...p, score: 0, streak: 0, bestStreak: 0, correct: 0, buzzTimes: [] })))
  const [phase, setPhase] = useState('intro')
  const [roundNo, setRoundNo] = useState(0)
  const [song, setSong] = useState(null)
  const [armed, setArmed] = useState(false)
  const [locked, setLocked] = useState([])
  const [hints, setHints] = useState([])
  const [answering, setAnswering] = useState(null) // { idx, steal, deadline }
  const [outcome, setOutcome] = useState(null)
  const [line, setLine] = useState('')
  const [mood, setMood] = useState('happy')
  const [countNum, setCountNum] = useState(null)
  const [cheer, setCheer] = useState(false)
  const [gain, setGain] = useState(null)
  const [pressed, setPressed] = useState(null)
  const [wrongFlash, setWrongFlash] = useState(0)
  const [audioError, setAudioError] = useState(false)

  const listenDeadline = useRef(0)
  const clipStart = useRef(0)
  const playLen = useRef(TIMING.clipSeconds)
  const buzzSec = useRef(0)
  const lastTick = useRef(null)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // latest state for callbacks fired from timers / key handlers
  const S = useRef({})
  S.current = { phase, armed, locked, hints, answering, players, song, roundNo }

  const isFinal = roundNo === maxRounds
  const now = useNow(phase === 'listening' || phase === 'answering', 100)

  const say = useCallback((kind, vars, { voice = true, sad = false } = {}) => {
    const l = hostLine(kind, vars)
    setLine(l)
    setMood(sad ? 'sad' : 'happy')
    if (voice) speakHost(l)
    else stopHostVoice()
  }, [])

  const nextSong = () => {
    if (!deck.current.length) deck.current = shuffle(songs)
    const s = deck.current.pop()
    if (deck.current.length) clip.preload(deck.current[deck.current.length - 1])
    return s
  }

  // ---------- round flow ----------
  const startListening = (s) => {
    setPhase('listening')
    setCountNum(null)
    stopHostVoice()
    playLen.current = TIMING.clipSeconds
    clip
      .play(s, s.startSeconds, TIMING.clipSeconds)
      .then(() => {
        clipStart.current = Date.now()
        listenDeadline.current = Date.now() + TIMING.listenWindow * 1000
        setArmed(true)
      })
      .catch(() => {
        setAudioError(true)
        setLine('אופס, השיר הזה לא מתנגן כרגע. מחליפים שיר!')
        later(() => {
          setAudioError(false)
          beginRound(S.current.roundNo, true)
        }, 1800)
      })
  }

  const beginRound = (n, sameRound = false) => {
    clearTimers()
    clip.stop()
    const s = nextSong()
    if (import.meta.env.DEV) window.__currentSong = s.title
    setSong(s)
    setRoundNo(n)
    setArmed(false)
    setLocked([])
    setHints([])
    setAnswering(null)
    setOutcome(null)
    setPressed(null)
    setGain(null)
    lastTick.current = null
    setPhase('countdown')
    if (!sameRound) say(n === maxRounds ? 'finalRound' : 'roundStart', { n })
    sfx.whoosh()
    const lead = sameRound ? 300 : 1400
    ;[3, 2, 1].forEach((k, i) =>
      later(() => {
        setCountNum(k)
        sfx.countdown(false)
      }, lead + i * 850),
    )
    later(() => {
      sfx.countdown(true)
      startListening(s)
    }, lead + 3 * 850)
  }

  // intro
  useEffect(() => {
    const [a, b] = config.players
    say('welcome', { a: a.name, b: b.name })
    later(() => sfx.applause(2.2, 0.8), 200)
    later(() => beginRound(1), 4200)
    return () => {
      clearTimers()
      stopHostVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reveal = (out, lineKind, vars, sad) => {
    clearTimers()
    setArmed(false)
    setAnswering(null)
    setOutcome(out)
    setPhase('reveal')
    say(lineKind, vars, { sad })
    const s = S.current.song
    clip.play(s, Math.max(0, s.startSeconds - 3), TIMING.revealSeconds).catch(() => {})
  }

  const buzz = (i) => {
    const st = S.current
    if (st.phase !== 'listening' || !st.armed || st.locked.includes(i)) return
    clip.stop(60)
    sfx.buzzer()
    setPressed(i)
    later(() => setPressed(null), 400)
    buzzSec.current = (Date.now() - clipStart.current) / 1000
    setAnswering({ idx: i, steal: false, deadline: Date.now() + TIMING.answerWindow * 1000 })
    setPhase('answering')
    say('buzz', { p: st.players[i].name }, { voice: false })
  }
  useBuzzerKeys(
    useMemo(() => config.players.map((p) => p.key), [config.players]),
    buzz,
  )

  const correct = (i) => {
    const st = S.current
    const p = st.players[i]
    const streakAfter = p.streak + 1
    const pts = scoreFor({ buzzSeconds: buzzSec.current, steal: st.answering?.steal, hintsUsed: st.hints.length, streakAfter, isFinal: st.roundNo === maxRounds })
    setPlayers((ps) =>
      ps.map((q, j) =>
        j === i ? { ...q, score: q.score + pts.total, streak: streakAfter, bestStreak: Math.max(q.bestStreak, streakAfter), correct: q.correct + 1, buzzTimes: st.answering?.steal ? q.buzzTimes : [...q.buzzTimes, buzzSec.current] } : { ...q, streak: 0 },
      ),
    )
    sfx.correct()
    later(() => sfx.applause(2.6, 1.1), 250)
    setCheer(true)
    setTimeout(() => setCheer(false), 3200)
    setGain({ key: Date.now(), value: pts.total, idx: i })
    reveal({ type: 'correct', name: p.name, color: p.color, points: pts }, streakAfter >= 3 ? 'streak' : 'correct', { p: p.name, s: streakAfter })
  }

  const wrong = (i, timedOut = false) => {
    const st = S.current
    sfx.wrong()
    setWrongFlash((k) => k + 1)
    const newLocked = [...st.locked, i]
    setLocked(newLocked)
    setPlayers((ps) => ps.map((q, j) => (j === i ? { ...q, streak: 0 } : q)))
    const other = st.players.findIndex((_, j) => !newLocked.includes(j))
    if (other >= 0) {
      setAnswering({ idx: other, steal: true, deadline: Date.now() + TIMING.answerWindow * 1000 })
      const msg = hostLine(timedOut ? 'answerTimeout' : 'wrong') + ' ' + hostLine('steal', { p: st.players[other].name })
      setLine(msg)
      setMood('sad')
    } else {
      later(() => sfx.aww(), 500)
      reveal({ type: 'nobody' }, timedOut ? 'answerTimeout' : 'wrong', {}, true)
    }
  }

  const submit = (alts) => {
    const st = S.current
    if (st.phase !== 'answering' || !st.answering) return
    const ok = alts.some((a) => isCorrectAnswer(a, st.song))
    if (ok) correct(st.answering.idx)
    else wrong(st.answering.idx)
  }

  const more = () => {
    const st = S.current
    if (st.phase !== 'listening' || !st.armed) return
    playLen.current = Math.min(playLen.current + TIMING.moreSeconds, 26 - Math.min(st.song.startSeconds, 20))
    listenDeadline.current = Math.max(listenDeadline.current, Date.now() + playLen.current * 1000 + 8000)
    lastTick.current = null
    clip.play(st.song, st.song.startSeconds, playLen.current).catch(() => {})
    say('more', {}, { voice: false })
  }

  const takeHint = (key) => {
    setHints((h) => (h.includes(key) ? h : [...h, key]))
    sfx.hint()
    say('hint', {}, { voice: false })
  }

  const skip = () => {
    if (!['listening', 'answering'].includes(S.current.phase)) return
    clip.stop()
    reveal({ type: 'skipped' }, 'skip', {})
  }

  const gameOver = players.some((p) => p.score >= target) || roundNo >= maxRounds

  const next = () => {
    if (S.current.phase !== 'reveal') return
    clip.stop()
    stopHostVoice()
    if (gameOver) onEnd(players)
    else beginRound(roundNo + 1)
  }

  // space → next round on reveal
  useEffect(() => {
    if (phase !== 'reveal') return
    const h = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  // timers driven by the clock
  useEffect(() => {
    if (phase === 'listening' && armed) {
      const left = (listenDeadline.current - now) / 1000
      if (left <= 0) {
        later(() => sfx.aww(), 300)
        reveal({ type: 'timeout' }, 'timeout', {}, true)
      } else if (left <= 5 && Math.ceil(left) !== lastTick.current) {
        lastTick.current = Math.ceil(left)
        sfx.tick()
      }
    }
    if (phase === 'answering' && answering) {
      const left = (answering.deadline - now) / 1000
      if (left <= 0) wrong(answering.idx, true)
      else if (left <= 4 && Math.ceil(left) !== lastTick.current) {
        lastTick.current = Math.ceil(left)
        sfx.tick()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const listenLeft = armed ? Math.max(0, (listenDeadline.current - now) / 1000) : TIMING.listenWindow
  const answerLeft = answering ? Math.max(0, (answering.deadline - now) / 1000) : 0

  const buzzerState = (i) => {
    if (phase === 'reveal' && outcome?.type === 'correct' && outcome.name === players[i].name) return 'winner'
    if (locked.includes(i)) return 'locked'
    if (pressed === i || answering?.idx === i) return 'pressed'
    if (phase === 'listening' && armed) return 'armed'
    return 'idle'
  }

  const status =
    phase === 'intro'
      ? 'מתחממים...'
      : phase === 'countdown'
        ? isFinal
          ? 'סיבוב אחרון - ניקוד כפול!'
          : 'היכונו...'
        : phase === 'listening'
          ? clip.playing
            ? 'מקשיבים...'
            : 'מי מזהה? לחצו על הזמזם!'
          : phase === 'answering'
            ? `${players[answering?.idx]?.name ?? ''} עונה...`
            : ''

  const station = (i) => (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <PlayerPod player={players[i]} highlight={answering?.idx === i} locked={locked.includes(i)} gain={gain?.idx === i ? gain : null} />
      <Buzzer color={players[i].color} name={players[i].name} keyCode={players[i].key} state={buzzerState(i)} onPress={() => buzz(i)} />
    </div>
  )

  return (
    <>
      <StudioBackground cheer={cheer} flash={phase === 'listening' && clip.playing} alarm={phase === 'answering' && answerLeft <= 4} />
      <div className="relative z-10 mx-auto flex min-h-full max-w-6xl flex-col px-3 pb-[15vh] pt-3 sm:px-6">
        {/* header */}
        <header className="flex items-center justify-between gap-2">
          <div className="glass rounded-full px-3 py-1 text-sm sm:px-4">
            סיבוב <span className="font-led font-bold text-neon-cyan">{roundNo || '-'}</span>
            <span className="text-white/40">/{maxRounds}</span>
            <span className="mx-2 text-white/30">|</span>
            יעד <span className="font-led font-bold text-neon-gold">{target}</span>
          </div>
          <div className="neon hidden font-display text-2xl sm:block" style={{ '--glow': '#ff2d95' }}>
            נחש את השיר
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('לצאת מהמשחק? הניקוד לא יישמר.')) {
                clip.stop(0)
                stopHostVoice()
                onExit()
              }
            }}
            className="glass rounded-full px-3 py-1 text-sm hover:bg-white/10"
          >
            יציאה ✕
          </button>
        </header>

        <div className="mt-3">
          <Host line={line} mood={mood} compact />
        </div>

        <main className="mt-2 grid flex-1 grid-cols-2 content-center items-center gap-3 sm:gap-6 lg:grid-cols-[minmax(180px,230px)_1fr_minmax(180px,230px)]">
          <div className="order-2 lg:order-1">{station(0)}</div>

          {/* the big screen */}
          <section className="order-1 col-span-2 lg:order-2 lg:col-span-1" aria-live="polite">
            <div className={`neon-box relative overflow-hidden rounded-3xl bg-black/55 p-4 sm:p-6 ${isFinal ? '' : ''}`} style={{ '--glow': isFinal ? '#ffc53d' : '#00e5ff' }} key={wrongFlash ? `w${wrongFlash}` : 'screen'}>
              {isFinal && <div className="absolute inset-x-0 top-0 bg-neon-gold/90 py-0.5 text-center text-xs font-black tracking-widest text-black">★ סיבוב אחרון · ניקוד כפול ★</div>}
              <div className={`flex items-center gap-4 ${wrongFlash ? 'shake' : ''}`}>
                <div className="h-28 flex-1 sm:h-36">
                  <Visualizer analyserRef={clip.analyserRef} active={clip.playing} color={isFinal ? '#ffc53d' : '#ff2d95'} />
                </div>
                <TimerRing remaining={phase === 'answering' ? answerLeft : listenLeft} total={phase === 'answering' ? TIMING.answerWindow : TIMING.listenWindow} label={phase === 'answering' ? 'לתשובה' : 'לזמזם'} size={92} />
              </div>
              <div className="mt-3 text-center font-display text-xl sm:text-2xl">{audioError ? '⚠️ בעיית אודיו' : status}</div>

              {(phase === 'listening' || phase === 'answering') && song && (
                <div className="mt-4 space-y-3">
                  <HintBar song={song} used={hints} onUse={takeHint} disabled={phase !== 'listening' && phase !== 'answering'} />
                  <div className="flex justify-center gap-2">
                    <button type="button" onClick={more} disabled={phase !== 'listening' || !armed || clip.playing} className="rounded-full border border-neon-cyan/60 bg-neon-cyan/10 px-4 py-1.5 text-sm transition hover:bg-neon-cyan/25 disabled:opacity-35">
                      🔁 שמעו עוד 5 שניות
                    </button>
                    <button type="button" onClick={skip} className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm transition hover:bg-white/15">
                      ⏭️ דלגו וחשפו
                    </button>
                  </div>
                </div>
              )}

              {countNum && phase === 'countdown' && (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <div key={countNum} className="countdown-num neon font-led text-8xl font-black" style={{ '--glow': '#ffc53d' }}>
                    {countNum}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="order-3">{station(1)}</div>
        </main>
      </div>

      {phase === 'answering' && answering && song && (
        <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/45 px-3 pt-24 backdrop-blur-[2px] sm:items-center sm:pt-0">
          <AnswerPanel key={`${roundNo}-${answering.idx}`} player={players[answering.idx]} steal={answering.steal} remaining={answerLeft} total={TIMING.answerWindow} songs={songs} onSubmit={submit} micEnabled={mic} />
        </div>
      )}

      {phase === 'reveal' && outcome && song && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-3 backdrop-blur-[2px]">
          <RevealCard song={song} outcome={outcome} onNext={next} isLast={gameOver} playing={clip.playing} />
        </div>
      )}
    </>
  )
}
