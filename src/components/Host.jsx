import { useEffect, useState } from 'react'
import { HOST_NAME } from '../lib/host'

function HostAvatar({ talking, mood = 'happy' }) {
  return (
    <svg viewBox="0 0 120 140" className={`h-full w-full host-bob ${talking ? 'host-talk' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id="jacket" x1="0" x2="1">
          <stop offset="0" stopColor="#ff2d95" />
          <stop offset="1" stopColor="#b06bff" />
        </linearGradient>
        <radialGradient id="skin" cx="45%" cy="40%">
          <stop offset="0" stopColor="#ffd9b8" />
          <stop offset="1" stopColor="#e9a57b" />
        </radialGradient>
      </defs>
      {/* jacket */}
      <path d="M14 140 Q16 96 60 92 Q104 96 106 140 Z" fill="url(#jacket)" />
      <path d="M48 93 L60 120 L72 93 Z" fill="#fff" />
      <path d="M53 100 L60 108 L67 100 L60 104 Z" fill="#111" />
      {[[30, 112], [88, 118], [24, 128], [96, 104]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" opacity="0.8" />
      ))}
      {/* neck + head */}
      <rect x="52" y="78" width="16" height="16" rx="6" fill="#e9a57b" />
      <ellipse cx="60" cy="52" rx="30" ry="33" fill="url(#skin)" />
      {/* hair */}
      <path d="M30 46 Q28 16 60 16 Q94 14 92 46 Q86 30 74 30 Q66 22 56 28 Q40 26 30 46 Z" fill="#2b1650" />
      <path d="M56 20 Q66 4 80 14 Q70 14 64 24 Z" fill="#2b1650" />
      {/* sunglasses */}
      <rect x="34" y="44" width="22" height="13" rx="5" fill="#0b0620" stroke="#00e5ff" strokeWidth="1.5" />
      <rect x="64" y="44" width="22" height="13" rx="5" fill="#0b0620" stroke="#00e5ff" strokeWidth="1.5" />
      <path d="M56 49 H64" stroke="#00e5ff" strokeWidth="1.8" />
      <path d="M38 47 l6 0" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
      <path d="M68 47 l6 0" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
      {/* mouth */}
      <g transform="translate(60 68)">
        {mood === 'sad' ? (
          <path d="M-9 4 Q0 -4 9 4" stroke="#6b2b2b" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path className="mouth" d="M-11 -2 Q0 13 11 -2 Z" fill="#6b1e2e" />
        )}
      </g>
      {/* microphone */}
      <g transform="rotate(-18 98 96)">
        <rect x="94" y="96" width="7" height="30" rx="3" fill="#333" />
        <circle cx="97.5" cy="92" r="8" fill="#9aa" stroke="#555" />
        <path d="M91 92 h13 M97.5 85 v14" stroke="#666" strokeWidth="1" />
      </g>
      <circle cx="104" cy="122" r="7" fill="#ffd9b8" />
    </svg>
  )
}

/** Virtual host with a typewriter speech bubble. */
export default function Host({ line, mood, compact = false }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!line) return
    let i = 0
    setShown('')
    const id = setInterval(() => {
      i += 2
      setShown(line.slice(0, i))
      if (i >= line.length) clearInterval(id)
    }, 28)
    return () => clearInterval(id)
  }, [line])
  const talking = !!line && shown.length < line.length
  return (
    <div className={`flex items-end gap-2 ${compact ? 'max-w-full' : 'max-w-xl'}`}>
      <div className={`${compact ? 'h-16 w-14' : 'h-24 w-20 sm:h-28 sm:w-24'} shrink-0`}>
        <HostAvatar talking={talking} mood={mood} />
      </div>
      {line && (
        <div key={line} className="glass pop-in relative mb-3 rounded-2xl rounded-be-none px-4 py-2.5 text-sm leading-snug shadow-lg sm:text-base">
          <div className="mb-0.5 text-[11px] font-bold tracking-wide text-neon-pink">{HOST_NAME}</div>
          <span className={talking ? 'typing-caret' : ''}>{shown}</span>
        </div>
      )}
    </div>
  )
}
