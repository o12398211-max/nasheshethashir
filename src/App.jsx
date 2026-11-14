import { useState } from 'react'
import StudioBackground from './components/StudioBackground'
import songsData from './data/songs.json'
import { unlockAudio } from './lib/audioContext'
import { setHostVoice } from './lib/host'
import { setSfxMuted } from './lib/sfx'
import DuelScreen from './screens/DuelScreen'
import EndScreen from './screens/EndScreen'
import HomeScreen from './screens/HomeScreen'
import SetupScreen from './screens/SetupScreen'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [config, setConfig] = useState(null)
  const [results, setResults] = useState(null)
  const [gameId, setGameId] = useState(0)

  const startGame = (cfg) => {
    unlockAudio() // inside the click gesture
    setSfxMuted(!cfg.sfx)
    setHostVoice(cfg.hostVoice)
    setConfig(cfg)
    setGameId((g) => g + 1)
    setScreen('game')
  }

  return (
    <div className="relative min-h-full">
      {(screen === 'home' || screen === 'setup') && <StudioBackground />}
      {screen === 'home' && <HomeScreen songCount={songsData.length} onPick={() => setScreen('setup')} />}
      {screen === 'setup' && <SetupScreen onBack={() => setScreen('home')} onStart={startGame} />}
      {screen === 'game' && (
        <DuelScreen
          key={gameId}
          config={config}
          songs={songsData}
          onExit={() => setScreen('home')}
          onEnd={(players) => {
            setResults(players)
            setScreen('end')
          }}
        />
      )}
      {screen === 'end' && results && <EndScreen players={results} onRematch={() => startGame(config)} onHome={() => setScreen('home')} />}
    </div>
  )
}
