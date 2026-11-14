import { GENRES } from '../lib/game'

const HEAD = {
  correct: { t: 'תשובה נכונה!', c: '#7dff4d' },
  timeout: { t: 'נגמר הזמן', c: '#ffc53d' },
  nobody: { t: 'אף אחד לא ידע', c: '#ff5a5a' },
  skipped: { t: 'דילגתם - הנה התשובה', c: '#00e5ff' },
}

export default function RevealCard({ song, outcome, onNext, isLast, playing }) {
  const h = HEAD[outcome.type] || HEAD.nobody
  return (
    <div className="glass pop-in w-full max-w-md rounded-3xl p-5 text-center shadow-2xl" style={{ boxShadow: `0 0 50px ${h.c}66` }}>
      <div className="font-display text-2xl sm:text-3xl" style={{ color: h.c, textShadow: `0 0 16px ${h.c}` }}>
        {h.t}
      </div>
      {outcome.type === 'correct' && (
        <div className="mt-1 text-sm text-white/80">
          <span className="font-bold" style={{ color: outcome.color }}>
            {outcome.name}
          </span>{' '}
          מרוויח/ה <bdi dir="ltr" className="font-led font-black text-neon-gold">+{outcome.points.total}</bdi>
          <div className="mt-0.5 text-xs text-white/50">
            {outcome.points.base} על מהירות{outcome.points.streakBonus ? ' · +1 בונוס רצף' : ''}
            {outcome.points.doubled ? ' · ×2 סיבוב אחרון' : ''}
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 text-start">
        <div className="relative shrink-0">
          {song.artwork ? (
            <img src={song.artwork} alt="" className={`h-28 w-28 object-cover shadow-[0_0_24px_rgba(255,255,255,0.25)] sm:h-32 sm:w-32 ${playing ? 'spin-slow rounded-full' : 'rounded-xl'}`} />
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-xl bg-white/10 text-5xl">🎵</div>
          )}
          {playing && <div className="absolute inset-0 m-auto h-5 w-5 rounded-full border-4 border-black/60 bg-[#140a2e]" />}
        </div>
        <div className="min-w-0">
          <div className="font-display text-2xl leading-tight sm:text-3xl">{song.title}</div>
          <div className="mt-1 text-lg text-neon-cyan">{song.artist}</div>
          <div className="mt-1 text-sm text-white/60">
            {song.year} · {GENRES[song.genre] || song.genre}
          </div>
          {song.audioSource?.type === 'itunes' && (
            <a href={`https://music.apple.com/il/song/${song.audioSource.trackId}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-white/50 underline hover:text-white">
              להאזנה לשיר המלא ב-Apple Music
            </a>
          )}
        </div>
      </div>
      <button type="button" onClick={onNext} className="mt-5 w-full rounded-2xl bg-gradient-to-l from-neon-pink to-[#b06bff] py-3 text-lg font-bold shadow-[0_0_24px_#ff2d95] transition hover:brightness-110 active:scale-[0.98]">
        {isLast ? 'לתוצאות הסופיות 🏆' : 'לסיבוב הבא ←'}
      </button>
      <div className="mt-2 hidden text-xs text-white/40 sm:block">או לחצו רווח</div>
    </div>
  )
}
