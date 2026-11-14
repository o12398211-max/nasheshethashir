import { HINTS } from '../lib/game'

export default function HintBar({ song, used, onUse, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="רמזים">
      {HINTS.map((h) => {
        const isUsed = used.includes(h.key)
        return (
          <button
            key={h.key}
            type="button"
            disabled={disabled || isUsed}
            onClick={() => onUse(h.key)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${isUsed ? 'pop-in neon-box bg-black/50 font-bold' : 'border border-white/20 bg-white/5 hover:bg-white/15 disabled:opacity-40'}`}
            style={isUsed ? { '--glow': '#ffc53d' } : undefined}
            title={isUsed ? '' : 'רמז מוריד נקודה אחת'}
          >
            <span aria-hidden="true">{h.icon}</span> {isUsed ? <span className="text-neon-gold">{h.value(song)}</span> : <>{h.label} <span className="text-xs text-white/50">(-1)</span></>}
          </button>
        )
      })}
    </div>
  )
}
