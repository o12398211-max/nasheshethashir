import { KEY_LABEL } from '../lib/game'

/** Big arcade buzzer. state: idle | armed | locked | pressed | winner */
export default function Buzzer({ color, name, keyCode, state = 'idle', onPress, size = 'lg' }) {
  const dims = size === 'lg' ? 'h-36 w-36 sm:h-44 sm:w-44' : 'h-24 w-24 sm:h-28 sm:w-28'
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={`זמזם של ${name}`}
        className={`buzzer ${dims} ${state}`}
        style={{ '--c': color }}
        onPointerDown={(e) => {
          e.preventDefault()
          onPress?.()
        }}
        disabled={state === 'locked'}
      >
        <span className="ring" />
        <span className="cap">
          <span className="font-display text-xl text-white drop-shadow sm:text-2xl">{state === 'locked' ? '🔒' : 'בַּזְזְ!'}</span>
        </span>
      </button>
      {keyCode && (
        <kbd className="hidden rounded-md border border-white/25 bg-black/40 px-2 py-0.5 font-led text-xs text-white/80 sm:inline-block">{KEY_LABEL(keyCode)}</kbd>
      )}
    </div>
  )
}
