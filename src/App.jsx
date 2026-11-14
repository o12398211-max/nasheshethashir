import { useState } from 'react'
import StudioBackground from './components/StudioBackground'
import songsData from './data/songs.json'
import { useClipPlayer } from './hooks/useClipPlayer'
import { unlockAudio } from './lib/audioContext'
import { saveStorage, storage } from './lib/game'
import { setHostVoice } from './lib/host'
import { setSfxMuted } from './lib/sfx'
import { useOnlineRoom } from './online/useOnlineRoom'
import DuelScreen from './screens/DuelScreen'
import EndScreen from './screens/EndScreen'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import OnlineGameScreen from './screens/OnlineGameScreen'
import SetupScreen from './screens/SetupScreen'

const DEFAULT_PREFS = { sfx: true, mic: true, hostVoice: false }

export default function App() {
  const clip = useClipPlayer()
  const room = useOnlineRoom()
  const [screen, setScreen] = useState('home')
  const [config, setConfig] = useState(null)
  const [results, setResults] = useState(null)
  const [gameId, setGameId] = useState(0)
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...storage('nhs-online-prefs', {}) }))

  const setPrefs = (p) => {
    setPrefsState(p)
    saveStorage('nhs-online-prefs', p)
    setSfxMuted(!p.sfx)
    setHostVoice(p.hostVoice)
  }

  /** Audio must be unlocked inside a click on mobile browsers. */
  const unlock = () => {
    unlockAudio()
    clip.unlock()
  }

  const startLocal = (cfg) => {
    unlock()
    setSfxMuted(!cfg.sfx)
    setHostVoice(cfg.hostVoice)
    setConfig(cfg)
    setGameId((g) => g + 1)
    setScreen('game')
  }

  const enterOnline = (fn) => async (payload) => {
    unlock()
    setPrefs(prefs)
    return fn(payload)
  }

  // ---------- online ----------
  const st = room.state
  if (st && room.me) {
    if (st.phase === 'lobby')
      return (
        <div className="relative min-h-full">
          <StudioBackground />
          <LobbyScreen room={room} prefs={prefs} setPrefs={setPrefs} />
        </div>
      )
    if (st.phase === 'end')
      return (
        <div className="relative min-h-full">
          <EndScreen
            key={`end-${st.round}`}
            players={st.players}
            line={st.line}
            onRematch={st.hostId === room.me ? () => room.emit('room:lobby') : null}
            rematchLabel="🔄 חזרה ללובי למשחק נוסף"
            waitingText="⏳ ממתינים למנהל/ת החדר"
            homeLabel="🚪 יציאה מהחדר"
            onHome={room.leave}
          />
        </div>
      )
    return (
      <div className="relative min-h-full">
        <OnlineGameScreen room={room} clip={clip} prefs={prefs} />
      </div>
    )
  }

  // ---------- local ----------
  return (
    <div className="relative min-h-full">
      {(screen === 'home' || screen === 'setup') && <StudioBackground />}
      {screen === 'home' && <HomeScreen songCount={songsData.length} onPickLocal={() => setScreen('setup')} onCreate={enterOnline(room.create)} onJoin={enterOnline(room.join)} />}
      {screen === 'setup' && <SetupScreen onBack={() => setScreen('home')} onStart={startLocal} />}
      {screen === 'game' && (
        <DuelScreen
          key={gameId}
          config={config}
          songs={songsData}
          clip={clip}
          onExit={() => setScreen('home')}
          onEnd={(players) => {
            setResults(players)
            setScreen('end')
          }}
        />
      )}
      {screen === 'end' && results && <EndScreen players={results} onRematch={() => startLocal(config)} onHome={() => setScreen('home')} />}
    </div>
  )
}
